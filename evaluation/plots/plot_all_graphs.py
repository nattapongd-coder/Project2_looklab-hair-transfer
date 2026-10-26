"""
plot_all_graphs.py — พล็อตกราฟทั้งหมดในสไลด์ (14 กราฟ) จากข้อมูลใน data/

วิธีใช้:
    pip install pandas numpy matplotlib scipy
    python plot_all_graphs.py            # ได้ไฟล์ PNG ทั้งหมดในโฟลเดอร์ out/

โครงสร้างโฟลเดอร์:
    plot_all_graphs.py
    fonts/IBMPlexSansThai-Regular.ttf, IBMPlexSansThai-Bold.ttf
    data/validation_by_epoch.csv   คะแนน validation ทุก epoch (จาก trial_*/summary.csv และ validation_per_case.csv)
    data/test_per_case.csv         ผล test 10 เคส × 4 โมเดล
    data/diffusion_stages.csv      MUSIQ / ArcFace 4 ขั้นของ Diffusion
    data/survey_answers.csv        แบบสอบถามผู้ใช้ 41 คน (blind)
    data/web_feedback.csv          feedback จากการใช้เว็บ 100 ครั้ง
    data/validation_5metrics_by_epoch.csv  ตัวชี้วัด 5 ด้าน validation ทุก epoch × 4 trial × 2 โมเดล

รายการกราฟ:
    01_select_hfg.png        คะแนนเลือก checkpoint ทุก epoch ของ HairFastGAN
    02_select_bs.png         คะแนนเลือก checkpoint ทุก epoch ของ Barbershop-FT
    03–07_test_*.png         ผลทดสอบรายตัวชี้วัด (สีผิด, IoU, ArcFace, MAE, SSIM)
    08_diff_musiq.png        MUSIQ ตามขั้น Diffusion
    09_diff_arcface.png      ArcFace ตามขั้น Diffusion
    10_survey_hfg.png        คะแนนผู้ใช้ HFG ก่อน/หลัง Diffusion
    11_survey_bs.png         คะแนนผู้ใช้ BS-FT ก่อน/หลัง Diffusion
    12_survey_wait.png       เวลาที่ผู้ใช้ยอมรอ
    13_web_ratings.png       สัดส่วนคะแนน 1–5 จากการใช้เว็บ
    14_web_wait.png          เวลารอจริงบนเว็บ
    15_hfg_5m_*.png          ตัวชี้วัด 5 ด้านทุก epoch ทั้ง 4 trial ของ HairFastGAN
    16_bs_5m_*.png           ตัวชี้วัด 5 ด้านทุก epoch ทั้ง 4 trial ของ Barbershop-FT
"""
import json, os
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager

HERE = Path(__file__).resolve().parent
DATA, OUT = HERE / 'data', HERE / 'out'
OUT.mkdir(exist_ok=True)

# ---------------- ฟอนต์ไทย + สไตล์ ----------------
for f in (HERE / 'fonts').glob('*.ttf'):
    font_manager.fontManager.addfont(str(f))
plt.rcParams.update({
    'font.family': ['IBM Plex Sans Thai', 'DejaVu Sans'], 'font.size': 13,  # DejaVu = สำรองสำหรับ ★ → ●
    'axes.spines.top': False, 'axes.spines.right': False, 'axes.spines.left': False,
    'axes.edgecolor': '#C9CED6', 'axes.labelcolor': '#46546A',
    'xtick.color': '#6B7689', 'ytick.color': '#6B7689',
    'axes.grid': True, 'axes.axisbelow': True, 'grid.color': '#E6E9EE', 'grid.linewidth': 1,
    'figure.dpi': 100, 'savefig.dpi': 200, 'savefig.bbox': 'tight', 'figure.facecolor': '#FDFDFC',
})
INK, INK2, MUTE = '#16202E', '#46546A', '#6B7689'
HFG, BS, GRAY, TEAL = '#B85F06', '#2F62B0', '#8A94A6', '#0F7A86'
GOOD, BAD = '#14825F', '#B3261E'
RNG = np.random.default_rng(3407)

def save(fig, name):
    fig.savefig(OUT / name); plt.close(fig); print('saved', OUT / name)

def boot_ci(x, n=10_000):
    x = np.asarray(x, float)
    m = [RNG.choice(x, len(x)).mean() for _ in range(n)]
    return float(np.percentile(m, 2.5)), float(np.percentile(m, 97.5))

# =====================================================================
# 1–2  คะแนนเลือก checkpoint ทุก epoch
#      score = ½ × ( สีผิด / สีผิด_ep0 + (1−IoU) / (1−IoU)_ep0 )   ต่ำ = ดี
# =====================================================================
val = pd.read_csv(DATA / 'validation_by_epoch.csv')
val['color'] = val.L_quantile + val.ab_quantile
val['shape_err'] = 1 - val.target_mask_IoU

def add_score(df):
    out = []
    for (m, t), g in df.groupby(['model', 'trial']):
        g = g.sort_values('epoch').copy()
        g0 = g[g.epoch == 0].iloc[0]
        g['score'] = 0.5 * (g.color / g0.color + g.shape_err / g0.shape_err)
        out.append(g)
    return pd.concat(out)
val = add_score(val)

def plot_selection(model, chosen, epoch, color, ylim, fname):
    d = val[val.model == model]
    fig, ax = plt.subplots(figsize=(10, 5.4))
    ax.axhline(1.0, color=INK2, ls='--', lw=1.5)
    ax.text(0.3, 1.005, 'epoch 0 (ก่อนฝึก) = 1.00', color=INK2, va='bottom', fontsize=12)
    ends = []
    for t, g in d.groupby('trial'):
        c, lw = (color, 3.2) if t == chosen else ('#B9C1CD', 1.8)
        ax.plot(g.epoch, g.score, color=c, lw=lw, zorder=3 if t == chosen else 2)
        ends.append([g.score.iloc[-1], t])
    ends.sort()                                     # กันป้าย A–D ทับกัน
    gap = (ylim[1] - ylim[0]) * 0.045
    for i in range(1, len(ends)):
        ends[i][0] = max(ends[i][0], ends[i - 1][0] + gap)
    for yv, t in ends:
        ax.text(30.4, yv, t, color=color if t == chosen else MUTE, fontsize=13, fontweight='bold', va='center')
    v = d[(d.trial == chosen) & (d.epoch == epoch)].score.iloc[0]
    ax.scatter([epoch], [v], s=110, color=color, edgecolor='white', lw=2.5, zorder=5)
    ax.annotate(f'★ {chosen} ep{epoch} = {v:.3f}', (epoch, v), xytext=(-12, -26), textcoords='offset points',
                ha='right', fontsize=14, fontweight='bold', color=INK,
                bbox=dict(boxstyle='round,pad=0.3', fc='white', ec=color, lw=1.5))
    ax.set_xlim(0, 30); ax.set_ylim(*ylim); ax.set_xlabel('epoch'); ax.set_ylabel('คะแนน (ต่ำ = ดี)')
    ax.set_title(f'{model}: คะแนน validation ทุก epoch (เส้นสี = trial ที่เลือก)', loc='left', color=INK, fontsize=15, fontweight='bold')
    save(fig, fname)

plot_selection('HairFastGAN', 'B', 24, HFG, (0.58, 1.04), '01_select_hfg.png')
plot_selection('Barbershop-FT', 'A', 30, BS, (0.78, 1.02), '02_select_bs.png')

# =====================================================================
# 3–7  ผลทดสอบ 10 เคส ทีละตัวชี้วัด (จุดจาง = 1 เคส · ขีด = ค่าเฉลี่ย)
# =====================================================================
test = pd.read_csv(DATA / 'test_per_case.csv')
test['color'] = test.L_quantile + test.ab_quantile
ROWS = [('HFG ก่อนฝึก', 'HairFastGAN · ก่อนฝึก', GRAY), ('HFG B ep24', 'HairFastGAN · B ep24', HFG),
        ('BS ก่อนฝึก', 'Barbershop · ก่อนฝึก', GRAY), ('BS-FT A ep30', 'Barbershop · FT A ep30', BS)]

def plot_metric(col, label, lower_better, xlim, fmt, fname):
    fig, ax = plt.subplots(figsize=(11, 5.2))
    ys = [3.6, 2.8, 1.2, 0.4]
    for (key, lab, c), y in zip(ROWS, ys):
        v = test[test.model == key][col].values
        ax.scatter(v, np.full_like(v, y), s=90, color=c, alpha=0.35, edgecolor='none', zorder=3)
        m = v.mean()
        ax.plot([m, m], [y - 0.28, y + 0.28], color=c if c != GRAY else '#5E687A', lw=5, solid_capstyle='round', zorder=4)
        ax.text(m, y + (0.36 if c == GRAY else -0.36), fmt.format(m), ha='center',
                va='bottom' if c == GRAY else 'top', fontsize=14, fontweight='bold', color=INK)
    for a, b, c in [(0, 1, HFG), (2, 3, BS)]:
        ma = test[test.model == ROWS[a][0]][col].mean(); mb = test[test.model == ROWS[b][0]][col].mean()
        ax.plot([ma, mb], [ys[a] - 0.3, ys[b] + 0.3], color=c, ls=(0, (3, 3)), lw=2)
    # จำนวนเคสที่ดีขึ้น
    for (a, b), y in [((0, 1), 3.2), ((2, 3), 0.8)]:
        d = test[test.model == ROWS[b][0]][col].values - test[test.model == ROWS[a][0]][col].values
        n = int(((d < 0) if lower_better else (d > 0)).sum())
        ax.text(xlim[1], y, f'ดีขึ้น {n}/10 เคส', ha='right', va='center', fontsize=12, color=INK2)
    ax.set_yticks(ys); ax.set_yticklabels([r[1] for r in ROWS]); ax.grid(axis='y', visible=False)
    ax.set_xlim(*xlim); ax.set_ylim(-0.2, 4.2)
    ax.set_xlabel(f'{label} · ' + ('← ต่ำกว่า = ดีกว่า' if lower_better else 'สูงกว่า = ดีกว่า →'))
    ax.set_title(f'{label}: ผลทดสอบ 10 เคส (จุดจาง = 1 เคส · ขีด = ค่าเฉลี่ย)', loc='left', color=INK, fontsize=15, fontweight='bold')
    save(fig, fname)

plot_metric('color', 'สีผิด L + ab', True, (0, 24), '{:.1f}', '03_test_color.png')
plot_metric('target_mask_IoU', 'IoU ทรงผม', False, (0.80, 0.97), '{:.3f}', '04_test_iou.png')
plot_metric('identity_cosine', 'ArcFace (หน้าเป็นคนเดิม)', False, (0.50, 0.92), '{:.3f}', '05_test_arcface.png')
plot_metric('protected_RGB_MAE_vs_input', 'MAE นอกผม', True, (0, 0.06), '{:.3f}', '06_test_mae.png')
plot_metric('protected_SSIM', 'SSIM นอกผม', False, (0.82, 0.98), '{:.3f}', '07_test_ssim.png')

# =====================================================================
# 8–9  ตัวชี้วัด Diffusion ทีละขั้น (วัด 1 ภาพต่อโมเดล)
# =====================================================================
dif = pd.read_csv(DATA / 'diffusion_stages.csv')
STAGES = ['ก่อน', 'Diffusion', 'พื้นหลัง', 'Sharp']

def plot_stage(col, title, ylim, fmt, fname):
    fig, ax = plt.subplots(figsize=(8, 4.8))
    for model, c, short in [('HairFastGAN B24', HFG, 'HFG'), ('Barbershop', BS, 'BS')]:
        g = dif[dif.model == model].set_index('stage').loc[STAGES]
        ax.plot(range(4), g[col], color=c, lw=3, marker='o', ms=8, mec='white', mew=2)
        ax.text(0.05, g[col].iloc[0], fmt.format(g[col].iloc[0]), va='bottom', fontsize=13, fontweight='bold')
        ax.text(3.1, g[col].iloc[-1], f'{short} {fmt.format(g[col].iloc[-1])}', color=c, va='center', fontsize=13, fontweight='bold')
    ax.set_xticks(range(4)); ax.set_xticklabels(STAGES); ax.set_xlim(-0.2, 3.7); ax.set_ylim(*ylim)
    ax.set_title(title, loc='left', color=INK, fontsize=15, fontweight='bold')
    save(fig, fname)

plot_stage('MUSIQ', 'คุณภาพภาพ MUSIQ (สูง = ดี)', (50, 74), '{:.1f}', '08_diff_musiq.png')
plot_stage('ArcFace', 'ตัวตน ArcFace เทียบรูปหน้าอินพุต (สูง = ดี)', (0.5, 0.9), '{:.2f}', '09_diff_arcface.png')

# =====================================================================
# 10–12  แบบสอบถามผู้ใช้ 41 คน (blind, สลับลำดับ)
#        ภาพ _1 = HFG B24 · _2 = HFG B24 + Diff · _3 = BS-FT A30 · _4 = BS-FT A30 + Diff
# =====================================================================
sv = pd.read_csv(DATA / 'survey_answers.csv')
sv['cond'] = sv.image_id.str.rsplit('_', n=1).str[1]
sv = sv[sv.cond.isin(['1', '2', '3', '4'])].copy()          # ตัดภาพทดสอบระบบ (_10) ออก
ans = pd.json_normalize(sv.answers_json.map(json.loads)); ans.index = sv.index
sv = pd.concat([sv, ans], axis=1)
sv['m'] = sv.cond.map({'1': 'HFG', '2': 'HFG+Diff', '3': 'BS', '4': 'BS+Diff'})
Q = [('q1', 'ทรงผมตรงอ้างอิง'), ('q2', 'สีผมตรงอ้างอิง'), ('q3', 'สมจริง เป็นธรรมชาติ'),
     ('q4', 'หน้ายังเหมือนตัวเอง'), ('q5', 'พึงพอใจใช้งานจริง')]
print('ผู้ตอบ', sv.participant_id.nunique(), 'คน')

def plot_survey(base, diff, color, title, fname):
    fig, ax = plt.subplots(figsize=(9, 5.2))
    for i, (q, lab) in enumerate(Q[::-1]):
        w = sv.pivot(index='participant_id', columns='m', values=q)
        a, b = w[base].mean(), w[diff].mean(); d = (w[diff] - w[base]).values
        lo, hi = boot_ci(d); sig = lo > 0 or hi < 0
        ax.plot([a, b], [i, i], color=color, lw=4, alpha=0.45, solid_capstyle='round')
        ax.scatter([a], [i], s=150, color=GRAY, edgecolor='white', lw=2, zorder=3)
        ax.scatter([b], [i], s=150, color=color, edgecolor='white', lw=2, zorder=3)
        ax.text(4.48, i, f'{d.mean():+.2f}' + (' *' if sig else ''), va='center', fontsize=14,
                fontweight='bold' if sig else 'normal', color=GOOD if d.mean() > 0 else BAD)
    ax.set_yticks(range(5)); ax.set_yticklabels([l for _, l in Q[::-1]]); ax.grid(axis='y', visible=False)
    ax.set_xlim(2.8, 4.7); ax.set_xlabel('คะแนนเฉลี่ย 1–5 · ● เทา = GAN · ● สี = + Diffusion · * = 95% CI ไม่คร่อม 0')
    ax.set_title(title, loc='left', color=INK, fontsize=15, fontweight='bold')
    save(fig, fname)

plot_survey('HFG', 'HFG+Diff', HFG, 'ผู้ใช้ 41 คน: HairFastGAN B24 ก่อน → หลัง Diffusion', '10_survey_hfg.png')
plot_survey('BS', 'BS+Diff', BS, 'ผู้ใช้ 41 คน: Barbershop-FT A30 ก่อน → หลัง Diffusion', '11_survey_bs.png')

WB = ['น้อยกว่า 1 นาที', '1–5 นาที', 'มากกว่า 5–10 นาที', 'มากกว่า 10–20 นาที', 'มากกว่า 20–40 นาที', 'มากกว่า 40 นาที']
cnt = sv.wait_bin.value_counts().reindex(WB, fill_value=0)
pct = 100 * cnt / cnt.sum()
fig, ax = plt.subplots(figsize=(9, 4.6))
bars = ax.barh(range(6)[::-1], pct.values, color=[TEAL if i < 2 else '#9CCDD2' for i in range(6)], height=0.62)
for y, p in zip(range(6)[::-1], pct.values):
    ax.text(p + 1, y, f'{p:.0f}%', va='center', fontsize=13, fontweight='bold')
ax.set_yticks(range(6)[::-1]); ax.set_yticklabels(['< 1 นาที', '1–5 นาที', '5–10 นาที', '10–20 นาที', '20–40 นาที', '> 40 นาที'])
ax.grid(axis='y', visible=False); ax.set_xlim(0, 75); ax.set_xlabel('% ของคำตอบ (41 คน × 4 ภาพ)')
ax.set_title(f'ผู้ใช้ยอมรอได้นานแค่ไหน · {pct.iloc[:2].sum():.0f}% ยอมรอไม่เกิน 5 นาที', loc='left', color=INK, fontsize=15, fontweight='bold')
save(fig, '12_survey_wait.png')

# =====================================================================
# 13–14  ทดลองใช้เว็บ 100 ครั้ง (HFG B24 + Diffusion)
# =====================================================================
web = pd.read_csv(DATA / 'web_feedback.csv')
WR = [('hairstyle_rating', 'ทรงผมตรงที่เลือก'), ('hair_color_rating', 'สีผมตรงที่เลือก'),
      ('face_similarity_rating', 'หน้ายังเหมือนตัวเอง'), ('overall_satisfaction_rating', 'พอใจผลลัพธ์โดยรวม'),
      ('waiting_satisfaction_rating', 'พอใจเวลารอ'), ('website_satisfaction_rating', 'พอใจเว็บไซต์')]
RC = {1: '#B3261E', 2: '#E8A39D', 3: '#C9CED6', 4: '#7FC6CC', 5: '#0F7A86'}
fig, ax = plt.subplots(figsize=(11, 5))
for i, (col, lab) in enumerate(WR[::-1]):
    dist = web[col].value_counts().reindex(range(1, 6), fill_value=0); p = 100 * dist / dist.sum(); left = 0
    for k in range(1, 6):
        if p[k] > 0:
            ax.barh(i, p[k], left=left, color=RC[k], height=0.62, edgecolor='white', lw=1.5)
            if p[k] >= 8: ax.text(left + p[k] / 2, i, f'{p[k]:.0f}%', ha='center', va='center', fontsize=12,
                                  fontweight='bold', color='white' if k == 5 else INK)
        left += p[k]
    ax.text(102, i, f'{web[col].mean():.2f}', va='center', fontsize=14, fontweight='bold')
ax.set_yticks(range(6)); ax.set_yticklabels([l for _, l in WR[::-1]]); ax.grid(visible=False)
ax.set_xlim(0, 110); ax.set_xticks([]); ax.spines['bottom'].set_visible(False)
from matplotlib.patches import Patch
ax.legend(handles=[Patch(color=RC[k], label=str(k)) for k in range(1, 6)], ncol=5, loc='upper left',
          bbox_to_anchor=(0, 1.12), frameon=False, title=None, fontsize=12)
ax.set_title(f'ทดลองใช้เว็บ {len(web)} ครั้ง: สัดส่วนคะแนน 1–5 (ขวา = ค่าเฉลี่ย)', loc='left', color=INK,
             fontsize=15, fontweight='bold', pad=34)
save(fig, '13_web_ratings.png')

w = web.user_wait_seconds.dropna()
bins = [10, 15, 20, 25, 30, 60]; labels = ['10–15 s', '15–20 s', '20–25 s', '25–30 s', '30 s ขึ้นไป']
c = pd.cut(w, bins=bins, right=False).value_counts().sort_index().values
fig, ax = plt.subplots(figsize=(9, 4.6))
ax.bar(range(5), c, color=[TEAL if i < 2 else '#9CCDD2' for i in range(5)], width=0.7)
for x, v in enumerate(c): ax.text(x, v + 1, str(v), ha='center', fontsize=14, fontweight='bold')
ax.set_xticks(range(5)); ax.set_xticklabels(labels); ax.grid(axis='x', visible=False)
ax.set_ylabel('จำนวนครั้ง'); ax.set_ylim(0, max(c) * 1.2)
ax.set_title(f'เวลารอจริงบนเว็บ · มัธยฐาน {w.median():.1f} s · {100 * (w <= 20).mean():.0f}% เสร็จใน 20 s',
             loc='left', color=INK, fontsize=15, fontweight='bold')
save(fig, '14_web_wait.png')
print('เสร็จ: กราฟทั้งหมดอยู่ใน', OUT)

# =====================================================================
# 15–16  ตัวชี้วัด 5 ด้านทุก epoch · ทั้ง 4 trial (validation 9 เคส)
#        เส้นประเทา = ค่า epoch 0 · เส้นประแดง = เกณฑ์ด่าน · ★ = epoch ที่เลือก
# =====================================================================
v5 = pd.read_csv(DATA / 'validation_5metrics_by_epoch.csv')
METRICS = [  # คอลัมน์, ชื่อไฟล์ย่อย, ทิศ (−1 ต่ำ=ดี / +1 สูง=ดี), เกณฑ์ (ระยะยอมจาก epoch 0), รูปแบบตัวเลข
    ('color', 'color', -1, 0.0, '{:.1f}'),
    ('iou', 'iou', +1, 0.0, '{:.3f}'),
    ('arcface', 'arcface', +1, 0.02, '{:.3f}'),
    ('protected_mae', 'mae', -1, 0.01, '{:.3f}'),
    ('detail_mae', 'detail', -1, 0.091, '{:.2f}'),
]
TRIAL_COL = {'A': '#2F62B0', 'B': '#B85F06', 'C': '#14825F', 'D': '#6E46B5'}

def plot_trials_metric(model, chosen, ep, col, sub, sign, tol, fmt):
    d = v5[v5.model == model]
    if model == 'Barbershop-FT' and col == 'iou': fmt = '{:.4f}'   # IoU ของ BS เปลี่ยนน้อยมาก
    base = d[(d.trial == chosen) & (d.epoch == 0)][col].iloc[0]
    gate = base - sign * tol                                  # ค่าขอบด่าน
    fig, ax = plt.subplots(figsize=(8, 4.1))
    plt.rcParams['font.size'] = 20
    ys = []
    for t, g in d.groupby('trial'):
        g = g.sort_values('epoch')
        lw = 4.2 if t == chosen else 2.4
        ax.plot(g.epoch, g[col], color=TRIAL_COL[t], lw=lw, alpha=1 if t == chosen else 0.8, zorder=3 if t == chosen else 2)
        ys += list(g[col])
    lo, hi = min(ys + [gate, base]), max(ys + [gate, base]); pad = (hi - lo) * 0.12 or 0.01
    ax.set_ylim(lo - pad, hi + pad)
    ax.axhline(base, color=INK2, ls=(0, (4, 3)), lw=1.8)
    if tol > 0:
        ax.axhline(gate, color=BAD, ls=(0, (6, 3)), lw=2.2)
    # พื้นที่ตกด่าน
    if sign < 0: ax.axhspan(gate, hi + pad, color=BAD, alpha=0.06, lw=0)
    else:        ax.axhspan(lo - pad, gate, color=BAD, alpha=0.06, lw=0)
    v = d[(d.trial == chosen) & (d.epoch == ep)][col].iloc[0]
    ax.scatter([ep], [v], s=170, color=TRIAL_COL[chosen], edgecolor='white', lw=3, zorder=6)
    ax.set_xlim(0, 30.5); ax.set_xticks([0, 10, 20, 30])
    ax.tick_params(labelsize=20); ax.set_xlabel('epoch', fontsize=20)
    ax.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda x, _: fmt.format(x)))
    ax.yaxis.set_major_locator(matplotlib.ticker.MaxNLocator(4))
    save(fig, f'{"15_hfg" if model == "HairFastGAN" else "16_bs"}_5m_{sub}.png')

def plot_trials_legend():
    fig, ax = plt.subplots(figsize=(8, 1.0)); ax.axis('off')
    for i, t in enumerate('ABCD'):
        ax.plot([i * 2, i * 2 + 0.6], [0, 0], color=TRIAL_COL[t], lw=5); ax.text(i * 2 + 0.8, 0, f'Trial {t}', va='center', fontsize=20)
    ax.set_xlim(-0.2, 8); save(fig, '15_legend.png')

import matplotlib.ticker
for model, chosen, ep in [('HairFastGAN', 'B', 24), ('Barbershop-FT', 'A', 30)]:
    for col, sub, sign, tol, fmt in METRICS:
        plot_trials_metric(model, chosen, ep, col, sub, sign, tol, fmt)
