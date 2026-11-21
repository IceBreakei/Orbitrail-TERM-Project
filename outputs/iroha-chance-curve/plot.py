from pathlib import Path
import re
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

s=Path('Development/game-config.js').read_text(encoding='utf-8')
power=float(re.search(r'iroha:\{[^\n]*attackAngleExponent:([\d.]+)',s).group(1))
angle=np.linspace(0,90,901)
t=(angle-45)/45
cannon=100*(.5-.5*np.sign(t)*np.abs(t)**power)
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11})
fig,ax=plt.subplots(figsize=(10,5.5),dpi=150)
ax.plot(angle,cannon,color='#147db3',lw=2.8,label='Cannon')
ax.plot(angle,100-cannon,color='#d56727',lw=2.8,ls='--',label='Artillery')
ax.axvspan(70,90,color='#7d8a96',alpha=.10)
ax.axvline(70,color='#9ba5ad',lw=1,ls=':')
ax.text(80,50,'Faster change\nafter 70°',ha='center',va='center',color='#54616c',fontsize=10)
ax.scatter([45],[50],s=30,color='#54616c',zorder=5)
ax.annotate('50% / 50%',xy=(45,50),xytext=(28,65),arrowprops={'arrowstyle':'-','color':'#7d8a96'},fontsize=10)
ax.set(xlim=(0,90),ylim=(0,100),xlabel='Player angle from Iroha (0° = horizontal, 90° = vertical)',ylabel='Attack chance (%)',title='Iroha attack chance — current cubic curve')
ax.set_xticks([0,10,20,30,40,45,50,60,70,80,90])
ax.set_yticks(np.arange(0,101,10))
ax.grid(axis='y',color='#dce2e6',lw=.7)
ax.spines[['top','right']].set_visible(False)
ax.legend(loc='upper center',ncol=2,frameon=False,bbox_to_anchor=(.5,1))
fig.tight_layout()
fig.savefig('outputs/iroha-chance-curve/iroha-chance-curve.png',bbox_inches='tight')
assert cannon[0]==100 and cannon[450]==50 and cannon[-1]==0
print('Verified axis endpoints and 45-degree midpoint.')
