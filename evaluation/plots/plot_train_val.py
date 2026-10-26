"""Plot recorded HairFastGAN trials; no training or checkpoint loading.
CLI: python plot_train_val.py --source results.zip --out figures
Also accepts an extracted study directory containing trial_A ... trial_D.
"""
from pathlib import Path
import argparse
import json
import zipfile
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages

COLORS = dict(A='#3178C6', B='#098C79', C='#DB9031', D='#9966B3')
SPECS = [
 ('loss', 'Total loss ↓'),
 ('L_quantile', 'Lightness error L ↓'),
 ('ab_quantile', 'Color error ab ↓'),
 ('identity_cosine', 'Face identity cosine ↑'),
 ('protected_RGB_MAE_vs_input', 'Protected-region MAE ↓'),
 ('detail_512_MAE_vs_pre', 'Detail MAE vs pre-output ↓'),
 ('color_loss', 'Color loss ↓'),
 ('shape_loss', 'Shape loss ↓'),
 ('target_mask_IoU', 'Hair-mask IoU ↑'),
]
COMPARE = [SPECS[1], SPECS[2], SPECS[8], SPECS[3], SPECS[4], ('score', 'Combined color / shape score ↓')]

class Source:
    def __init__(self, path):
        self.path = Path(path)
        self.z = zipfile.ZipFile(self.path) if self.path.is_file() else None
    def read_csv(self, name):
        if self.z:
            matches = [n for n in self.z.namelist() if n == name or n.endswith('/' + name)]
            if len(matches) != 1:
                raise ValueError(f'Expected one {name}; found {matches}')
            with self.z.open(matches[0]) as f:
                return pd.read_csv(f)
        return pd.read_csv(self.path / name)
    def close(self):
        if self.z: self.z.close()

def style(ax, title):
    ax.set_title(title, loc='left', fontsize=12, fontweight='bold', pad=10)
    ax.grid(alpha=.2)
    ax.spines[['top', 'right']].set_visible(False)
    ax.set_xlabel('Epoch')
    ax.set_xlim(0, 30)
    ax.set_xticks(range(0, 31, 5))

def run(source, out='figures', show=True):
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    src = Source(source)
    plt.rcParams.update({'font.family':'DejaVu Sans', 'font.size':10, 'figure.facecolor':'white'})
    histories = {}; trains = {}; selections = {}; counts = {}
    try:
        leaderboard = src.read_csv('leaderboard.csv').set_index('trial')
        for t in COLORS:
            steps = src.read_csv(f'trial_{t}/training_steps.csv')
            records = src.read_csv(f'trial_{t}/metrics.csv')
            # Exclude the old comparator (negative epochs), never use its results.
            records = records.loc[(records['split'] == 'validation') & (records.epoch >= 0)].copy()
            steps = steps.loc[steps.epoch >= 1].copy()
            if records.duplicated(['epoch', 'case']).any() or steps['update'].duplicated().any():
                raise ValueError(f'{t}: duplicated records; resolve resumed-run logs first')
            val = records.groupby('epoch').mean(numeric_only=True)
            train = steps.groupby('epoch').mean(numeric_only=True)
            if val.index.tolist() != list(range(31)) or train.index.tolist() != list(range(1,31)):
                raise ValueError(f'{t}: expected validation 0..30 and training 1..30')
            sizes = records.groupby('epoch').size()
            if sizes.nunique() != 1:
                raise ValueError(f'{t}: validation count changes between epochs')
            counts[t] = int(sizes.iloc[0])
            selections[t] = int(leaderboard.loc[t, 'best_epoch'])
            histories[t], trains[t] = val, train
            train.to_csv(out / f'trial_{t}_train_epoch_means.csv')
            val.to_csv(out / f'trial_{t}_validation_epoch_means.csv')
    finally:
        src.close()
    base = histories['A'].loc[0]
    for t,val in histories.items():
        metric_keys=[k for k,_ in SPECS]
        np.testing.assert_allclose(val.loc[0,metric_keys],base[metric_keys],rtol=1e-7,atol=1e-9)
        # Same normalized score used in the supplied leaderboard. Baseline = 1.
        val['score'] = .5*((val.L_quantile+val.ab_quantile)/(base.L_quantile+base.ab_quantile)
                          +(1-val.target_mask_IoU)/(1-base.target_mask_IoU))
        np.testing.assert_allclose(val.loc[selections[t],'score'],leaderboard.loc[t,'score'],rtol=1e-7)
    figures = []
    def save(fig, name, pdf):
        fig.savefig(out / (name+'.png'),dpi=180,bbox_inches='tight')
        pdf.savefig(fig,bbox_inches='tight')
        figures.append(out / (name+'.png'))
        if show: plt.show()
        plt.close(fig)
    with PdfPages(out/'all_train_val_and_comparisons.pdf') as pdf:
        # Display A, then B, C, D before any combined figure.
        for t in COLORS:
            train, val = trains[t], histories[t]; best = selections[t]
            fig, axs = plt.subplots(3,3,figsize=(15,12))
            for ax,(key,title) in zip(axs.flat,SPECS):
                if key in train:
                    ax.plot(train.index,train[key],color='#3178C6',lw=1.8,label='Train: mean of update logs')
                else:
                    ax.text(.04,.92,'Train metric not logged',transform=ax.transAxes,va='top',fontsize=9,color='#667085')
                ax.plot(val.index,val[key],color='#D87523',lw=1.8,label='Validation: end of epoch')
                ax.axhline(base[key],ls=':',color='#7B8494',lw=1.2,label='Pretrained validation baseline')
                ax.axvline(best,ls='--',color='#818898',lw=1,alpha=.6)
                ax.scatter(best,val.loc[best,key],marker='*',s=130,color='#D87523',edgecolor='white',zorder=5)
                style(ax,title)
            fig.suptitle(f'Trial {t} | Train and validation | Selected epoch {best}',fontsize=20,fontweight='bold',y=.985)
            fig.text(.07,.948,f'Blending LR = {leaderboard.loc[t,"blend_lr"]:g}    PostProcess LR = {leaderboard.loc[t,"pp_lr"]:g}    Validation: {counts[t]} pairs',fontsize=11)
            h,l=axs.flat[0].get_legend_handles_labels()
            fig.legend(h,l,loc='lower center',bbox_to_anchor=(.5,.052),ncol=3,frameon=False)
            fig.text(.07,.02,'Train values are recorded during weight updates; validation uses the end-of-epoch model.\nTheir gap is descriptive, not a controlled train-set vs validation-set evaluation. Star = selected checkpoint.',fontsize=10,color='#667085')
            fig.subplots_adjust(top=.89,bottom=.13,hspace=.4,wspace=.29)
            save(fig,f'01_trial_{t}_train_validation',pdf)
        # Combined train/validation: separate columns; common y-scale per metric.
        fig,axs=plt.subplots(3,2,figsize=(13,12),sharex=True)
        for i,(key,title) in enumerate([SPECS[0],SPECS[1],SPECS[2]]):
            limits=[]
            for j,(collection,label) in enumerate([(trains,'Train: update-log means'),(histories,'Validation: end of epoch')]):
                ax=axs[i,j]
                for t,d in collection.items(): ax.plot(d.index,d[key],color=COLORS[t],label=t,lw=1.7)
                style(ax,f'{title} | {label}')
                limits.extend(ax.get_ylim())
            for ax in axs[i]: ax.set_ylim(min(limits),max(limits))
        fig.suptitle('All trials | Train and validation in separate panels',fontsize=19,fontweight='bold')
        fig.legend(*axs[0,0].get_legend_handles_labels(),loc='lower center',ncol=4,frameon=False)
        fig.tight_layout(rect=(0,.04,1,.95));save(fig,'02_all_trials_train_validation',pdf)
        # Same validation comparison layout as the earlier report.
        fig,axs=plt.subplots(2,3,figsize=(15,9))
        for ax,(key,title) in zip(axs.flat,COMPARE):
            ax.axhline(histories['A'].loc[0,key],ls='--',color='#7B8494',label='Baseline')
            for t,val in histories.items():
                ax.plot(val.index,val[key],color=COLORS[t],label=t,lw=1.7)
                e=selections[t];ax.scatter(e,val.loc[e,key],marker='*',s=120,color=COLORS[t],edgecolor='white',zorder=5)
            style(ax,title)
        fig.suptitle('All trials | Validation learning curves',fontsize=20,fontweight='bold')
        fig.legend(*axs.flat[0].get_legend_handles_labels(),loc='lower center',ncol=5,frameon=False)
        fig.tight_layout(rect=(0,.06,1,.95));save(fig,'03_all_trials_validation',pdf)
        rows=[dict(model='Baseline',epoch=0,**histories['A'].loc[0].to_dict())]
        for t,val in histories.items():rows.append(dict(model=t,epoch=selections[t],**val.loc[selections[t]].to_dict()))
        result=pd.DataFrame(rows)
        result.to_csv(out/'best_checkpoints_vs_baseline.csv',index=False)
        fig,axs=plt.subplots(2,3,figsize=(15,9))
        for ax,(key,title) in zip(axs.flat,COMPARE):
            values=result[key].to_numpy()
            ax.bar(range(5),values,color=['#7B8494']+list(COLORS.values()),width=.65)
            ax.set_xticks(range(5),['Baseline']+[f'{t}\nep {selections[t]}' for t in COLORS])
            ax.set_ylim(0,max(values)*1.2)
            ax.set_title(title,loc='left',fontsize=12,fontweight='bold');ax.grid(axis='y',alpha=.18);ax.set_axisbelow(True)
            ax.spines[['top','right']].set_visible(False)
            for i,v in enumerate(values):ax.text(i,v+max(values)*.025,f'{v:.4f}',ha='center',fontsize=10)
        fig.suptitle('Official pretrained baseline vs best checkpoint of A–D',fontsize=19,fontweight='bold')
        fig.text(.06,.025,f'Validation means ({counts["A"]} pairs); not test results. Baseline = epoch 0. Negative-epoch comparator rows excluded.',color='#667085')
        fig.tight_layout(rect=(0,.07,1,.95));save(fig,'04_baseline_vs_best_trials',pdf)
    notes = {
        'source':str(source), 'selected_epochs':selections, 'validation_pairs':counts,
        'train_aggregation':'Unweighted arithmetic mean of update logs per epoch (batch=1 in this study).',
        'validation_aggregation':'Arithmetic mean across validation cases at each epoch.',
        'missing_train_metrics':['target_mask_IoU'],
        'score_formula':'0.5*((L+ab)/(baseline_L+baseline_ab)+(1-IoU)/(1-baseline_IoU))',
        'selection':'Uses existing leaderboard best_epoch, not separate best epoch for each metric.',
        'excluded':'All validation rows with epoch < 0 and all old comparator columns.',
        'caution':'Single-seed validation results; no test evaluation or confidence intervals inferred.'
    }
    (out/'plot_notes.json').write_text(json.dumps(notes,indent=2),encoding='utf-8')
    print('Saved figures and tables to:',out.resolve())
    return result, figures

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',required=True,help='Review ZIP or extracted study directory')
    parser.add_argument('--out',default='figures')
    parser.add_argument('--show',action='store_true')
    args=parser.parse_args()
    run(args.source,args.out,args.show)
