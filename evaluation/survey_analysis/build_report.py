from pathlib import Path
import json, zipfile
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator

ROOT=Path(__file__).parent
OUT=ROOT/'output';OUT.mkdir(exist_ok=True)
src=ROOT/'upload/FORME Hair Study Database - FS_AnswerSets(1).csv'
d=pd.read_csv(src)
a=pd.DataFrame(d.answers_json.map(json.loads).tolist())
d=pd.concat([d,a],axis=1)
qs=['q1','q2','q3','q4','q5']
labels=['Hair shape','Hair color','Realism','Face identity','Satisfaction']
groups=['1','2','3','4']
colors=['#527B99','#B66A83','#D19D43','#378E84']
d['suffix']=d.image_id.str.rsplit('_',n=1).str[-1]
assert not d.duplicated(['participant_id','image_id']).any()
assert d[qs].isin(range(1,6)).all().all()
d['five_item_mean']=d[qs].mean(axis=1)
main=d[d.suffix.isin(groups)].copy()
assert (pd.crosstab(main.participant_id,main.suffix)==1).all().all()
means=main.groupby('suffix')[qs].mean().reindex(groups)
summary=main.groupby('suffix')[qs+['five_item_mean']].agg(['mean','std','count'])
summary.to_csv(OUT/'group_summary.csv',encoding='utf-8-sig')
d[['participant_id','image_id','suffix']+qs+['five_item_mean','wait_bin']].to_csv(OUT/'scored_answers.csv',index=False,encoding='utf-8-sig')
waits=json.loads(pd.read_csv(ROOT/'upload/FORME Hair Study Database - FS_Questions(1).csv').set_index('question_id').loc['wait_bin','options_json'])
waitlabels=['<1 min','1–5 min','>5–10 min','>10–20 min','>20–40 min','>40 min']
counts=pd.crosstab(main.suffix,main.wait_bin).reindex(index=groups,columns=waits,fill_value=0)
counts.to_csv(OUT/'willingness_to_wait_counts.csv',encoding='utf-8-sig')
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'axes.spines.top':False,'axes.spines.right':False,'axes.spines.left':False,'axes.edgecolor':'#D7DDE2','text.color':'#23303D','axes.labelcolor':'#53616D','xtick.color':'#53616D','ytick.color':'#53616D','figure.facecolor':'#F5F6F8','axes.facecolor':'white','savefig.facecolor':'#F5F6F8'})
def heading(fig,title,sub):
 fig.text(.045,.96,'FORME  /  HAIR STUDY',fontsize=13,color='#A45F75',weight='bold')
 fig.text(.045,.925,title,fontsize=25,weight='bold')
 fig.text(.045,.892,sub,fontsize=11,color='#53616D')
def clean(ax,title):
 ax.set_title(title,loc='left',fontweight='bold',fontsize=14,pad=18)
 ax.set_axisbelow(True)
def save(fig,name):
 fig.savefig(OUT/(name+'.png'),dpi=190,bbox_inches='tight')
 fig.savefig(OUT/(name+'.svg'),bbox_inches='tight')
 plt.close(fig)

fig=plt.figure(figsize=(16,13))
heading(fig,'Evaluation results · actual responses','165 submitted sets  |  164 sets in the four-group comparison  |  41 matched participant IDs')
gs=fig.add_gridspec(2,2,left=.065,right=.965,top=.82,bottom=.23,hspace=.55,wspace=.24)
ax=fig.add_subplot(gs[0,0]);clean(ax,'01  Mean rating by criterion')
x=np.arange(5);w=.19
for i,g in enumerate(groups):
 bars=ax.bar(x+(i-1.5)*w,means.loc[g],width=w,color=colors[i],label='Suffix _'+g,zorder=3)
 ax.bar_label(bars,fmt='%.2f',fontsize=8,padding=3)
ax.set_xticks(x,labels,fontsize=10);ax.set_ylim(0,5.6);ax.set_yticks(range(6));ax.set_ylabel('Mean rating (1–5)');ax.grid(axis='y',alpha=.18)
ax.legend(ncol=2,frameon=False,fontsize=9,loc='upper center',bbox_to_anchor=(.5,1.02))
ax=fig.add_subplot(gs[0,1]);clean(ax,'02  Overall rating · equal weight across Q1–Q5')
overall=main.groupby('suffix').five_item_mean.agg(['mean','std']).reindex(groups)
bars=ax.barh(np.arange(4),overall['mean'],color=colors,height=.57)
ax.set_yticks(np.arange(4),['Suffix _'+g for g in groups]);ax.invert_yaxis();ax.set_xlim(0,5);ax.set_xlabel('Mean of five-item averages (1–5)');ax.grid(axis='x',alpha=.18)
for i,g in enumerate(groups):ax.text(overall.loc[g,'mean']+.08,i,f"{overall.loc[g,'mean']:.3f}  ± {overall.loc[g,'std']:.3f}",va='center',fontsize=10)
ax.text(0,-.22,'Labels: mean ± sample SD of 41 response-set averages per group.',transform=ax.transAxes,fontsize=9,color='#53616D')
ax=fig.add_subplot(gs[1,0]);clean(ax,'03  Willingness to wait · response counts')
wc=['#B65A73','#D68B9C','#E4BBA6','#97B9B3','#488E87','#355D69'];left=np.zeros(4)
for col,l,c in zip(waits,waitlabels,wc):
 vals=counts[col].to_numpy();ax.barh(np.arange(4),vals,left=left,color=c,label=l,height=.56)
 for i,v in enumerate(vals):
  if v:ax.text(left[i]+v/2,i,str(v),ha='center',va='center',fontsize=10,color='white' if c in [wc[0],wc[4],wc[5]] else '#23303D',weight='bold')
 left+=vals
ax.set_yticks(np.arange(4),['Suffix _'+g for g in groups]);ax.invert_yaxis();ax.set_xlim(0,43);ax.set_xlabel('Number of responses (41 per group)');ax.xaxis.set_major_locator(MaxNLocator(integer=True));ax.legend(ncol=3,fontsize=9,frameon=False,loc='upper left',bbox_to_anchor=(-.03,-.20))
ax=fig.add_subplot(gs[1,1]);clean(ax,'04  Satisfaction (Q5) · rating distribution')
dist=pd.crosstab(main.suffix,main.q5).reindex(index=groups,columns=range(1,6),fill_value=0)
left=np.zeros(4)
for rating,c in zip(range(1,6),['#C66D79','#DEA297','#E3CC9A','#98BFB6','#368D83']):
 vals=dist[rating].to_numpy();ax.barh(np.arange(4),vals,left=left,height=.56,color=c,label=str(rating))
 for i,v in enumerate(vals):
  if v:ax.text(left[i]+v/2,i,str(v),ha='center',va='center',fontsize=10)
 left+=vals
ax.set_yticks(np.arange(4),['Suffix _'+g for g in groups]);ax.invert_yaxis();ax.set_xlim(0,43);ax.set_xlabel('Number of responses (41 per group)');ax.xaxis.set_major_locator(MaxNLocator(integer=True));ax.legend(title='Rating',ncol=5,fontsize=9,frameon=False,loc='upper left',bbox_to_anchor=(-.03,-.20))
fig.text(.045,.085,'READ BEFORE INTERPRETING',fontsize=10,weight='bold',color='#A45F75')
fig.text(.045,.043,'Suffixes come from image_id; model identities and component settings are not provided. Groups are provisional, not verified models.\nThe _10 record (n=1; all ratings=5) is retained in the data export, but kept out of the balanced comparison. Waiting answers are preferences, not runtime.',fontsize=10,linespacing=1.6)
save(fig,'FORME_evaluation_dashboard')

fig=plt.figure(figsize=(15,10));heading(fig,'Paired differences · preparation for ablation analysis','Actual within-participant differences  |  41 matched IDs  |  Reference: suffix _1 (not a confirmed baseline)')
ax=fig.add_axes([.17,.29,.74,.51]);clean(ax,'Change in mean rating relative to suffix _1')
paired=[];y=np.arange(6)
for j,g in enumerate(groups[1:]):
 delta=[]
 for q in qs+['five_item_mean']:
  p=main.pivot(index='participant_id',columns='suffix',values=q)
  diff=p[g]-p['1'];delta.append(diff.mean());paired.append({'comparison':g+' minus 1','metric':q,'n_pairs':len(diff),'mean_paired_difference':diff.mean(),'sd_paired_difference':diff.std()})
 yy=y+(j-1)*.22
 ax.barh(yy,delta,height=.19,color=colors[j+1],label='Suffix _'+g+' minus _1')
 for yi,v in zip(yy,delta):ax.text(v+(.018 if v>=0 else -.018),yi,f'{v:+.3f}',va='center',ha='left' if v>=0 else 'right',fontsize=10)
ax.axvline(0,color='#53616D',lw=1);ax.set_yticks(y,labels+['Five-item mean']);ax.invert_yaxis();ax.set_xlim(-1.15,.85);ax.set_xlabel('Mean paired difference (rating points)');ax.grid(axis='x',alpha=.15);ax.legend(frameon=False,ncol=3,loc='upper center',bbox_to_anchor=(.5,-.13))
fig.text(.06,.16,'ABLATION STATUS: COMPONENT MAPPING REQUIRED',color='#A45F75',weight='bold',fontsize=12)
fig.text(.06,.075,'These are descriptive group contrasts, not evidence of an isolated component effect.\nTo interpret them as an ablation study, identify each suffix, the full system and the removed components,\nand verify matched input images and identical experimental conditions. No significance or causal claims are made.',fontsize=11,linespacing=1.7)
save(fig,'FORME_paired_comparison')
pd.DataFrame(paired).to_csv(OUT/'paired_differences.csv',index=False,encoding='utf-8-sig')
notes='''# FORME — ผลประเมินจริง

อ่านเฉพาะไฟล์ FS_AnswerSets(1).csv และ FS_Questions(1).csv ที่แนบมา ไม่รวมสำเนาไฟล์ชื่อคล้ายกัน

- 165 ชุดคำตอบ จาก 41 participant_id; 1 ชุดคำตอบ = การประเมินภาพหนึ่งภาพ มีคะแนน 5 ข้อและคำตอบช่วงเวลารอ 1 ข้อ
- คะแนน 825 คำตอบ และคำตอบเวลารอ 165 คำตอบ ครบ ไม่มีคะแนนนอกช่วง 1–5 และไม่มี participant_id/image_id ซ้ำ
- แบ่งตามส่วนท้าย image_id เท่านั้น: _1/_2/_3/_4 อย่างละ 41 ชุด; ยังไม่มีข้อมูลยืนยันว่ารหัสแต่ละตัวคือโมเดลอะไร
- ทุก participant_id มีคำตอบครบทั้งสี่กลุ่ม จับคู่ผลต่างด้วย participant_id ไม่ได้ยืนยันความเหมือนของภาพต้นทาง
- _10 มี 1 ชุดของ U000 คะแนนทุกข้อเป็น 5 รอ >10–20 นาที; เก็บไว้ใน scored_answers.csv แต่ไม่รวมกราฟเปรียบเทียบที่สมดุล ไม่ถือว่าเป็นข้อมูลผิดหรือข้อมูลทดสอบโดยอัตโนมัติ
- Q1 ทรงผมตรงภาพอ้างอิง; Q2 สีผมตรงภาพอ้างอิง; Q3 สมจริง; Q4 ใบหน้าเหมือนผู้ประเมิน; Q5 พึงพอใจใช้งานจริง
- คะแนนรวมเป็นค่าเฉลี่ย Q1–Q5 ให้น้ำหนักเท่ากัน เป็นตัวสรุปเชิงพรรณนา ไม่ใช่มาตรวัดที่ผ่านการยืนยันความเที่ยงตรง
- SD คือส่วนเบี่ยงเบนมาตรฐานตัวอย่างของค่าเฉลี่ยห้าข้อต่อชุดคำตอบ ไม่ใช่ confidence interval
- กราฟเวลาแสดงจำนวนคำตอบในแต่ละช่วงของเวลาที่ผู้ประเมินยินดีรอ ไม่ใช่เวลาประมวลผลจริง ไม่แปลงช่วงเป็นเวลาเฉลี่ย
- ผลต่างจับคู่ใช้กลุ่ม _1 เป็นจุดอ้างอิงเพื่ออ่านกราฟเท่านั้น ไม่ได้ยืนยันว่าเป็น baseline หรือระบบเต็ม ไม่มีการทดสอบนัยสำคัญ
- ต้องการตาราง image_id → model/variant เช่น FS_Images และข้อมูลเปิด/ปิดโมดูล จึงจะสรุป Ablation Study ได้ถูกต้อง

ไฟล์ PNG ใช้ดู/แทรกรายงาน; SVG เป็นเวกเตอร์; CSV เป็นค่าจริงตรวจสอบได้; build_report.py ใช้สร้างซ้ำโดยวางไฟล์ต้นฉบับสองไฟล์ใน upload/
'''
(OUT/'README_th.md').write_text(notes,encoding='utf-8')
with zipfile.ZipFile(OUT/'FORME_evaluation_charts.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(OUT.iterdir()):
  if p.suffix!='.zip':z.write(p,p.name)
 z.write(ROOT/'build_report.py','build_report.py')
print('OVERALL',overall.round(5).to_string())
print('WAIT COUNTS',counts.to_string())
print('Files generated:',[p.name for p in OUT.iterdir()])
