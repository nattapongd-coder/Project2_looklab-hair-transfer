"""Replace HairFastGAN's StyleGAN CUDA extensions with native PyTorch ops.

Copied verbatim from the LOOKLAB notebook (section 3, "แบบเดียวกับ notebook ฝึก"):
the B24 checkpoint was fine-tuned with these native ops, so inference uses them too.
Side effect: nothing is compiled with nvcc, so the image works on any GPU torch supports
(including Blackwell sm_120). Usage: python3 patch_stylegan_native.py /app/HairFastGAN
"""
# No PyTorch/CUDA version downgrade; no changes to weights or transfer parameters.
import ast, hashlib, importlib, sys
from pathlib import Path
STYLEGAN_OPS_BACKEND = 'torch_native'

def _native_stylegan_source(source, kind):
    marker = '# HAIRFAST_TORCH_NATIVE_V1'
    if marker in source:
        return source
    tree = ast.parse(source)
    extension = 'fused' if kind == 'fused_act' else 'upfirdn2d_op'
    entry = 'fused_leaky_relu' if kind == 'fused_act' else 'upfirdn2d'
    edits = []
    found_load = found_entry = False
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == extension for t in node.targets):
            if not isinstance(node.value, ast.Call) or not isinstance(node.value.func, ast.Name) or node.value.func.id != 'load':
                raise RuntimeError('รูปแบบ extension เปลี่ยนไป: ' + kind)
            edits.append((node.lineno-1, node.end_lineno, extension + ' = None\n'))
            found_load = True
        if isinstance(node, ast.FunctionDef) and node.name == entry:
            edits.append((node.lineno-1, node.end_lineno, FUSED_NATIVE if kind == 'fused_act' else UP_NATIVE))
            found_entry = True
    if not found_load or not found_entry:
        raise RuntimeError('ไม่พบจุด patch ที่คาดไว้ใน ' + kind)
    lines = source.splitlines(True)
    for start,end,text in sorted(edits, reverse=True):
        lines[start:end] = [text]
    updated = marker + '\n' + ''.join(lines)
    if kind == 'upfirdn2d' and not any(isinstance(n, ast.FunctionDef) and n.name == 'upfirdn2d_native' for n in tree.body):
        updated += '\n\n' + UP_NATIVE_IMPL + '\n'
    compile(updated, kind + '.py', 'exec')
    return updated

FUSED_NATIVE = 'def fused_leaky_relu(input, bias=None, negative_slope=0.2, scale=2 ** 0.5):\n    if bias is not None:\n        input = input + bias.reshape(1, -1, *([1] * (input.ndim - 2)))\n    return torch.nn.functional.leaky_relu(input, negative_slope=negative_slope) * scale\n'
UP_NATIVE = 'def upfirdn2d(input, kernel, up=1, down=1, pad=(0, 0)):\n    return upfirdn2d_native(input, kernel, up, up, down, down,\n                           pad[0], pad[1], pad[0], pad[1])\n'
UP_NATIVE_IMPL = 'def upfirdn2d_native(\n    input, kernel, up_x, up_y, down_x, down_y, pad_x0, pad_x1, pad_y0, pad_y1\n):\n    _, channel, in_h, in_w = input.shape\n    input = input.reshape(-1, in_h, in_w, 1)\n\n    _, in_h, in_w, minor = input.shape\n    kernel_h, kernel_w = kernel.shape\n\n    out = input.view(-1, in_h, 1, in_w, 1, minor)\n    out = F.pad(out, [0, 0, 0, up_x - 1, 0, 0, 0, up_y - 1])\n    out = out.view(-1, in_h * up_y, in_w * up_x, minor)\n\n    out = F.pad(\n        out, [0, 0, max(pad_x0, 0), max(pad_x1, 0), max(pad_y0, 0), max(pad_y1, 0)]\n    )\n    out = out[\n        :,\n        max(-pad_y0, 0) : out.shape[1] - max(-pad_y1, 0),\n        max(-pad_x0, 0) : out.shape[2] - max(-pad_x1, 0),\n        :,\n    ]\n\n    out = out.permute(0, 3, 1, 2)\n    out = out.reshape(\n        [-1, 1, in_h * up_y + pad_y0 + pad_y1, in_w * up_x + pad_x0 + pad_x1]\n    )\n    w = torch.flip(kernel, [0, 1]).view(1, 1, kernel_h, kernel_w)\n    out = F.conv2d(out, w)\n    out = out.reshape(\n        -1,\n        minor,\n        in_h * up_y + pad_y0 + pad_y1 - kernel_h + 1,\n        in_w * up_x + pad_x0 + pad_x1 - kernel_w + 1,\n    )\n    out = out.permute(0, 2, 3, 1)\n    out = out[:, ::down_y, ::down_x, :]\n\n    out_h = (in_h * up_y + pad_y0 + pad_y1 - kernel_h) // down_y + 1\n    out_w = (in_w * up_x + pad_x0 + pad_x1 - kernel_w) // down_x + 1\n\n    return out.view(-1, channel, out_h, out_w)'

def install_native_stylegan_ops(repo):
    root = Path(repo).resolve()
    pairs = sorted((root / 'models').rglob('op/fused_act.py'))
    if not pairs:
        raise RuntimeError('ไม่พบ StyleGAN operator ใน ' + str(root))
    planned = []
    for fused_path in pairs:
        for path,kind in [(fused_path,'fused_act'), (fused_path.with_name('upfirdn2d.py'),'upfirdn2d')]:
            if not path.is_file():
                raise RuntimeError('ขาด operator: ' + str(path))
            module_name = '.'.join(path.relative_to(root).with_suffix('').parts)
            if module_name in sys.modules:
                raise RuntimeError('StyleGAN ถูก import แล้ว: Restart runtime แล้วรันตามลำดับใหม่')
            old = path.read_text()
            planned.append((path, old, _native_stylegan_source(old,kind)))
    # Validate every candidate before writing; preserve each original once.
    records = []
    for path,old,new in planned:
        if old != new:
            backup = path.with_suffix('.py.before_native')
            if not backup.exists(): backup.write_text(old)
            path.write_text(new)
        records.append({'path':str(path.relative_to(root)),
                        'sha256':hashlib.sha256(new.encode()).hexdigest()})
    importlib.invalidate_caches()
    return records


if __name__ == '__main__':
    repo = sys.argv[1] if len(sys.argv) > 1 else '/app/HairFastGAN'
    patches = install_native_stylegan_ops(repo)
    print('StyleGAN backend:', STYLEGAN_OPS_BACKEND, '| patched files:', len(patches))
    for p in patches:
        print('  ', p['path'], p['sha256'][:12])
    # Small smoke check (CPU at build time) — same as the notebook.
    import torch
    _check = {'torch': torch, 'F': torch.nn.functional}
    exec(FUSED_NATIVE + '\n' + UP_NATIVE_IMPL + '\n' + UP_NATIVE, _check)
    _device = 'cuda' if torch.cuda.is_available() else 'cpu'
    _x = torch.randn(1, 2, 5, 5, device=_device, requires_grad=True)
    _b = torch.randn(2, device=_device, requires_grad=True)
    _y = _check['fused_leaky_relu'](_x, _b, .1)
    torch.testing.assert_close(_y, torch.nn.functional.leaky_relu(_x + _b.view(1, 2, 1, 1), .1) * (2 ** .5))
    _z = _check['upfirdn2d'](_x, torch.ones(1, 1, device=_device))
    torch.testing.assert_close(_z, _x)
    (_y.sum() + _z.sum()).backward()
    assert torch.isfinite(_x.grad).all() and torch.isfinite(_b.grad).all()
    print('Native operator smoke check passed on', _device)
