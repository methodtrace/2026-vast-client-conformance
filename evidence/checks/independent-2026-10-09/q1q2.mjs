const NM=new URL('../../../code/harness/node_modules/video-ad-sdk/dist', import.meta.url).pathname;
// Copy of compareBySequence (vastSelectors/index.js:13-28) with getAttribute from xmlSelectors.js:45-51
const getAttribute=(el,n)=>(el.attributes??{})[n];
const compareBySequence = (itemA, itemB) => {
  const a = getAttribute(itemA,'sequence'), b = getAttribute(itemB,'sequence');
  const A = a && parseInt(a,10), B = b && parseInt(b,10);
  if (typeof A !== 'string' || typeof B !== 'string') return 0;
  if (A < B) return -1; if (A > B) return 1; return 0;
};
const ad=(s,id)=>({name:'Ad',attributes:{sequence:s,id}});
console.log('cmp("1","3") =', compareBySequence(ad('1'),ad('3')), ' cmp("3","1") =', compareBySequence(ad('3'),ad('1')));
const ads=[ad('3','A'),ad('1','B'),ad('2','C')];
console.log('sorted ids:', ads.slice().sort(compareBySequence).map(x=>x.attributes.id+':'+x.attributes.sequence).join(','));
// Q2: import real onProgress
const { onProgress } = await import(NM+'/adUnit/helpers/metrics/handlers/onProgress.js').catch(e=>({err:e}));
console.log(typeof onProgress);
