"""พล็อตผลประเมินจริง: ใช้ pandas, numpy, matplotlib (มีใน Google Colab)
รันบนเครื่อง: python FORME_plot_all.py --answers "FS_AnswerSets.csv" --questions "FS_Questions.csv"
เปอร์เซ็นต์คะแนน = mean/5*100; เปอร์เซ็นต์คำตอบ = count/valid responses*100
"""
from pathlib import Path
import argparse
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

MODELS = {'1':'HairFastGAN', '2':'HairFastGAN + Diffusion',
          '3':'Barbershop', '4':'Barbershop + Diffusion'}
ORDER = list(MODELS.values())
COLORS = ['#527B99','#B66A83','#D19D43','#378E84']
QS = ['q1','q2','q3','q4','q5']
LABELS = ['Hair shape','Hair color','Realism','Face identity','Satisfaction']
WAIT_LABELS = ['<1 min','1–5 min','>5–10 min','>10–20 min','>20–40 min','>40 min']

def plot_all(answers_path, questions_path, output_dir='FORME_charts', show=True):
    out = Path(output_dir); out.mkdir(parents=True, exist_ok=True)
    d = pd.read_csv(answers_path, dtype=str)
    q = pd.read_csv(questions_path, dtype=str).set_index('question_id')
    required = {'participant_id','image_id','answers_json','questions_json'}
    if not required.issubset(d.columns):
        raise ValueError('ไฟล์คำตอบต้องมีคอลัมน์: '+str(required))
    if d[['participant_id','image_id']].isna().any().any():
        raise ValueError('พบ participant_id หรือ image_id ว่าง')
    if d.duplicated(['participant_id','image_id']).any():
        raise ValueError('พบคำตอบซ้ำ participant_id/image_id: ตรวจข้อมูลก่อนรวมผล')
    a = pd.DataFrame([json.loads(s) for s in d.answers_json])
    for k in QS:
        a[k] = pd.to_numeric(a[k], errors='raise')
        if not a[k].isin([1,2,3,4,5]).all():
            raise ValueError('คะแนนต้องครบและอยู่ในช่วง 1–5: '+k)
    # ตรวจช่วงคะแนนและถ้อยคำของคำถาม ไม่รวมแบบสอบถามต่างความหมายเงียบ ๆ
    for k in QS:
        if json.loads(q.loc[k,'options_json']) != {'min':1,'max':5}:
            raise ValueError('ช่วงคะแนนไม่ใช่ 1–5: '+k)
    for snapshot in d.questions_json.unique():
        lookup = {item['question_id']:item for item in json.loads(snapshot)}
        for k in QS+['wait_bin']:
            if k not in lookup or lookup[k]['label'] != q.loc[k,'label']:
                raise ValueError('คำถามในคำตอบไม่ตรงกับ FS_Questions: '+k)
    waits = json.loads(q.loc['wait_bin','options_json'])
    expected_waits = ['น้อยกว่า 1 นาที','1–5 นาที','มากกว่า 5–10 นาที',
                      'มากกว่า 10–20 นาที','มากกว่า 20–40 นาที','มากกว่า 40 นาที']
    if waits != expected_waits:
        raise ValueError('ตัวเลือกเวลารอเปลี่ยนไป: ปรับ WAIT_LABELS และลำดับก่อนรัน')
    if not a.wait_bin.isin(waits).all():
        raise ValueError('พบคำตอบเวลาว่างหรือไม่อยู่ในตัวเลือก')
    d = pd.concat([d.reset_index(drop=True),a],axis=1)
    d['suffix'] = d.image_id.str.rsplit('_',n=1).str[-1]
    d['model'] = d.suffix.map(MODELS)
    excluded = d[d.model.isna()].copy()
    excluded.to_csv(out/'excluded_unmapped_records.csv',index=False,encoding='utf-8-sig')
    d = d[d.model.notna()].copy()
    if set(d.model) != set(ORDER):
        raise ValueError('ไม่พบข้อมูลครบทั้งสี่โมเดล')
    d['overall'] = d[QS].mean(axis=1)
    d[['participant_id','image_id','model']+QS+['overall','wait_bin']].to_csv(
        out/'scored_answers.csv',index=False,encoding='utf-8-sig')
    n = d.groupby('model').size().reindex(ORDER)
    means = d.groupby('model')[QS+['overall']].mean().reindex(ORDER)
    pct = means*20
    means.to_csv(out/'mean_scores_1_to_5.csv',encoding='utf-8-sig')
    pct.to_csv(out/'scores_percent_of_maximum.csv',encoding='utf-8-sig')
    d.groupby('model')[QS+['overall']].agg(['count','mean','std']).reindex(ORDER).to_csv(
        out/'descriptive_statistics.csv',encoding='utf-8-sig')
    plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,
        'axes.spines.top':False,'axes.spines.right':False,'axes.spines.left':False,
        'axes.titleweight':'bold','axes.titlepad':18,'figure.facecolor':'white',
        'axes.labelcolor':'#344454','text.color':'#23303D','svg.fonttype':'none'})
    saved=[]
    def save(fig,name,note):
        fig.tight_layout(rect=[0,.075,1,.96])
        fig.text(.02,.025,note,fontsize=9,color='#52616D')
        for ext in ['png','svg']:
            p=out/(name+'.'+ext);fig.savefig(p,dpi=300,bbox_inches='tight');saved.append(p)
        if show: plt.show()
        plt.close(fig)
    # 1: ค่าเฉลี่ยรายด้าน แปลงเป็นเปอร์เซ็นต์ของคะแนนเต็ม
    fig,ax=plt.subplots(figsize=(15,7));x=np.arange(5);w=.19
    for i,m in enumerate(ORDER):
        b=ax.bar(x+(i-1.5)*w,pct.loc[m,QS],w,color=COLORS[i],label=f'{m} (n={n[m]})')
        ax.bar_label(b,fmt='%.1f',padding=3,fontsize=9)
    ax.set(xticks=x,xticklabels=LABELS,ylim=(0,112),ylabel='Score (% of maximum)',title='Quality comparison by criterion')
    ax.set_yticks(range(0,101,20));ax.legend(ncol=2,frameon=False,loc='upper center')
    save(fig,'01_quality_by_criterion','Score percentage = mean rating / 5 × 100. Not accuracy or percentage of respondents.')
    # 2: อันดับคะแนนภาพรวม
    fig,ax=plt.subplots(figsize=(13,6));ranking=pct.overall.sort_values(ascending=True)
    b=ax.barh(ranking.index,ranking,color=[COLORS[ORDER.index(m)] for m in ranking.index])
    ax.bar_label(b,labels=[f'{v:.1f}%  ({v/20:.3f}/5)' for v in ranking],padding=7)
    ax.set(xlim=(0,105),xlabel='Score (% of maximum)',title='Overall ranking · equal weight across five criteria')
    save(fig,'02_overall_ranking','Descriptive ranking; small differences do not establish statistical superiority.')
    # 3: heatmap ทุกด้านและค่าเฉลี่ยรวม
    fig,ax=plt.subplots(figsize=(13,5));im=ax.imshow(pct, vmin=20,vmax=100,cmap='YlGnBu',aspect='auto')
    ax.set_xticks(np.arange(6),LABELS+['Overall']);ax.set_yticks(np.arange(4),ORDER)
    for i in range(4):
        for j in range(6):
            v=pct.iloc[i,j];ax.text(j,i,f'{v:.1f}%',ha='center',va='center',color='white' if v>72 else '#23303D')
    ax.set_title('Quality score heatmap');fig.colorbar(im,ax=ax,label='Score (% of maximum)')
    save(fig,'03_score_heatmap','Percentages are normalized mean scores, not response shares.')
    # 4: การกระจายคะแนน 1–5 ทุกคำถาม ใช้จำนวนคำตอบจริง
    fig,axes=plt.subplots(3,2,figsize=(16,12));likert=['#C86C79','#DDA194','#E3CA92','#91BEB5','#32887C']
    dist_rows=[]
    for qi,ax in enumerate(axes.flat):
        if qi==5:ax.axis('off');continue
        counts=pd.crosstab(d.model,d[QS[qi]]).reindex(index=ORDER,columns=range(1,6),fill_value=0)
        left=np.zeros(4)
        for rating,c in zip(range(1,6),likert):
            vals=counts[rating].to_numpy();ax.barh(ORDER,vals,left=left,color=c,label=str(rating))
            for i,v in enumerate(vals):
                if v:ax.text(left[i]+v/2,i,str(v),ha='center',va='center',fontsize=9)
                dist_rows.append({'model':ORDER[i],'question':QS[qi],'rating':rating,'responses':int(v),'percent':v/n.iloc[i]*100})
            left+=vals
        ax.invert_yaxis();ax.set(title=LABELS[qi],xlabel='Number of responses');ax.legend(ncol=5,frameon=False,fontsize=8)
    pd.DataFrame(dist_rows).to_csv(out/'rating_distribution.csv',index=False,encoding='utf-8-sig')
    save(fig,'04_rating_distributions','Each bar includes all valid responses for one model and criterion. Numbers inside bars are response counts.')
    # 5: สัดส่วนคำตอบคะแนน 4–5 ทุกด้าน
    top=d.assign(**{k:d[k].ge(4) for k in QS}).groupby('model')[QS].mean().reindex(ORDER)*100
    top.to_csv(out/'top_two_box_percent.csv',encoding='utf-8-sig')
    fig,ax=plt.subplots(figsize=(15,7))
    for i,m in enumerate(ORDER):
        b=ax.bar(x+(i-1.5)*w,top.loc[m],w,color=COLORS[i],label=m);ax.bar_label(b,fmt='%.1f',padding=3,fontsize=9)
    ax.set(xticks=x,xticklabels=LABELS,ylim=(0,115),ylabel='Responses rating 4 or 5 (%)',title='High-rating response share (4–5 out of 5)')
    ax.set_yticks(range(0,101,20));ax.legend(ncol=2,frameon=False,loc='upper center')
    save(fig,'05_high_rating_share','Response percentage = number of ratings 4–5 / valid responses × 100. Different from mean-score percentage.')
    # 6: เวลารอภาพรวมตามที่ผู้ใช้ขอ (ไม่รวมรหัสที่ไม่รู้จัก เช่น _10)
    wc=d.wait_bin.value_counts().reindex(waits,fill_value=0);wp=wc/len(d)*100
    pd.DataFrame({'responses':wc,'percent':wp}).to_csv(out/'overall_waiting_time.csv',encoding='utf-8-sig')
    fig,ax=plt.subplots(figsize=(12,6));b=ax.barh(WAIT_LABELS,wc,color=['#A9B8C7','#B66A83','#79A9A2','#D7BC89','#B3A5C4','#CFD7DE'])
    ax.bar_label(b,labels=[f'{c} responses ({p:.1f}%)' for c,p in zip(wc,wp)],padding=7)
    ax.invert_yaxis();ax.set_xlim(0,max(wc)*1.4);ax.set(xlabel='Number of responses',title=f'Overall willingness to wait · {len(d)} responses')
    save(fig,'06_overall_waiting_time','Maximum willingness to wait for this image quality; not measured model runtime. Multiple answers may come from the same participant.')
    # 7: เวลาแยกตามโมเดล
    ct=pd.crosstab(d.model,d.wait_bin).reindex(index=ORDER,columns=waits,fill_value=0)
    ct.to_csv(out/'waiting_time_by_model.csv',encoding='utf-8-sig')
    fig,ax=plt.subplots(figsize=(13,6));left=np.zeros(4)
    for j,(label,c) in enumerate(zip(WAIT_LABELS,['#B66A83','#D69DAD','#DCC59D','#9DBEB8','#518F88','#536B83'])):
        vals=ct.iloc[:,j].to_numpy();ax.barh(ORDER,vals,left=left,label=label,color=c)
        for i,v in enumerate(vals):
            if v:ax.text(left[i]+v/2,i,str(v),ha='center',va='center',fontsize=9)
        left+=vals
    ax.invert_yaxis();ax.set(xlabel='Number of responses',title='Willingness to wait by model');ax.legend(ncol=3,frameon=False,bbox_to_anchor=(.5,1.02),loc='lower center')
    save(fig,'07_waiting_time_by_model','Counts of maximum-wait preference responses; not inference time.')
    # 8: Ablation จับคู่คนเดียวกัน รุ่นเพิ่ม Diffusion ลบรุ่นพื้นฐานของตนเอง
    if d.duplicated(['participant_id','model']).any():
        raise ValueError('พบหลายภาพต่อคนต่อโมเดล: ต้องกำหนดวิธีจับคู่ภาพก่อนทำ ablation')
    deltas=[];pairs=[(ORDER[0],ORDER[1],'HairFastGAN'),(ORDER[2],ORDER[3],'Barbershop')]
    fig,ax=plt.subplots(figsize=(12,8));y=np.arange(6)
    for j,(base,enh,family) in enumerate(pairs):
        values=[];n_pair=None
        for k in QS+['overall']:
            pivot=d.pivot(index='participant_id',columns='model',values=k)[[base,enh]].dropna()
            diff=(pivot[enh]-pivot[base])*20;n_pair=len(diff)
            if not n_pair:raise ValueError('ไม่มีคำตอบจับคู่สำหรับ '+family)
            values.append(diff.mean());deltas.append({'family':family,'metric':k,'n_pairs':n_pair,'mean_change_percentage_points':diff.mean()})
        yy=y+(j-.5)*.34;b=ax.barh(yy,values,height=.30,color=COLORS[1 if j==0 else 3],label=f'{family}: +Diffusion − base (n={n_pair} pairs)')
        ax.bar_label(b,labels=[f'{v:+.1f}' for v in values],padding=5)
    ax.axvline(0,color='#53616D',lw=1);ax.set_yticks(y,LABELS+['Overall']);ax.invert_yaxis()
    ax.set(xlabel='Change in score (percentage points)',title='Diffusion ablation · paired descriptive comparison')
    ax.margins(x=.25);ax.legend(frameon=False,loc='lower right',fontsize=9)
    save(fig,'08_diffusion_ablation','Within-participant contrasts. Attribute changes to Diffusion only if inputs and other experimental conditions are controlled. No significance claim.')
    pd.DataFrame(deltas).to_csv(out/'ablation_paired_differences.csv',index=False,encoding='utf-8-sig')
    metadata={'input_answer_file':str(answers_path),'input_question_file':str(questions_path),'included_response_sets':len(d),
        'participant_ids':d.participant_id.nunique(),'excluded_unmapped_records':len(excluded),
        'model_counts':n.to_dict(),'model_mapping':MODELS,'mean_score_percent':'mean / 5 * 100',
        'wait_note':'Maximum willingness to wait, not measured inference time','pairing':'participant_id; input-image equivalence must be verified externally'}
    (out/'analysis_metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'เสร็จแล้ว: {len(d)} ชุดคำตอบ, {d.participant_id.nunique()} participant_id; แยกรหัสไม่ทราบโมเดล {len(excluded)} ชุด')
    print('บันทึก 8 กราฟ เป็น PNG 300 dpi และ SVG พร้อม CSV ที่',out.resolve())
    print(means.round(3).to_string())
    return {'output_dir':out,'files':saved,'scores':means,'ablation':pd.DataFrame(deltas)}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--answers',required=True);parser.add_argument('--questions',required=True)
    parser.add_argument('--output',default='FORME_charts');parser.add_argument('--show',action='store_true')
    args=parser.parse_args();plot_all(args.answers,args.questions,args.output,args.show)
