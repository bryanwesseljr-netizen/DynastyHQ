const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c};
const lum=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;

const loadImage=async(src)=>{
  const response=await fetch(src);
  if(!response.ok) throw new Error('EA article image could not be loaded.');
  const blob=await response.blob();
  if(globalThis.createImageBitmap) return createImageBitmap(blob);
  const url=URL.createObjectURL(blob);
  try{
    return await new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=()=>resolve(image);
      image.onerror=()=>reject(new Error('EA article image could not be decoded.'));
      image.src=url;
    });
  }finally{URL.revokeObjectURL(url)}
};

const smooth=(values,radius=3)=>values.map((_,i)=>{
  let sum=0,count=0;
  for(let j=Math.max(0,i-radius);j<=Math.min(values.length-1,i+radius);j+=1){sum+=values[j];count+=1}
  return count?sum/count:0;
});

const centerRun=(flags,target)=>{
  let start=-1,best=null,longest=null;
  for(let i=0;i<=flags.length;i+=1){
    if(i<flags.length&&flags[i]&&start<0) start=i;
    if((i===flags.length||!flags[i])&&start>=0){
      const run={start,end:i-1};
      if(run.start<=target&&run.end>=target) best=run;
      if(!longest||run.end-run.start>longest.end-longest.start) longest=run;
      start=-1;
    }
  }
  return best||longest||{start:0,end:flags.length-1};
};

const cropBounds=(raw)=>{
  const sw=Math.min(420,raw.width),sh=Math.max(1,Math.round(raw.height*(sw/raw.width)));
  const sample=canvas(sw,sh),ctx=sample.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(raw,0,0,sw,sh);
  const px=ctx.getImageData(0,0,sw,sh).data;
  const nonDark=(x,y)=>{const i=(y*sw+x)*4;return lum(px[i],px[i+1],px[i+2])>60?1:0};
  const cols=[];
  for(let x=0;x<sw;x+=1){
    let sum=0,count=0;
    for(let y=Math.round(sh*.05);y<Math.round(sh*.95);y+=2){sum+=nonDark(x,y);count+=1}
    cols.push(count?sum/count:0);
  }
  const xr=centerRun(smooth(cols,4).map(v=>v>.30),Math.floor(sw/2));
  const rows=[];
  for(let y=0;y<sh;y+=1){
    let sum=0,count=0;
    for(let x=xr.start;x<=xr.end;x+=2){sum+=nonDark(x,y);count+=1}
    rows.push(count?sum/count:0);
  }
  const yr=centerRun(smooth(rows,3).map(v=>v>.24),Math.floor(sh/2));
  const sx=raw.width/sw,sy=raw.height/sh;
  const x=clamp(Math.round(xr.start*sx),0,raw.width-2);
  const y=clamp(Math.round(yr.start*sy),0,raw.height-2);
  return {
    x,y,
    width:clamp(Math.round((xr.end-xr.start+1)*sx),2,raw.width-x),
    height:clamp(Math.round((yr.end-yr.start+1)*sy),2,raw.height-y),
  };
};

const crop=(raw,b)=>{
  const out=canvas(b.width,b.height);
  out.getContext('2d').drawImage(raw,b.x,b.y,b.width,b.height,0,0,b.width,b.height);
  return out;
};

const resize=(raw,width)=>{
  if(raw.width===width) return raw;
  const out=canvas(width,Math.round(raw.height*(width/raw.width)));
  const ctx=out.getContext('2d');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(raw,0,0,out.width,out.height);
  return out;
};

const inkMap=(raw,width=160)=>{
  const w=Math.min(width,raw.width),h=Math.max(1,Math.round(raw.height*(w/raw.width)));
  const c=canvas(w,h),ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(raw,0,0,w,h);
  const px=ctx.getImageData(0,0,w,h).data,values=new Float32Array(w*h);
  for(let i=0,j=0;i<px.length;i+=4,j+=1) values[j]=clamp((205-lum(px[i],px[i+1],px[i+2]))/205,0,1);
  return {w,h,values};
};

const scoreOverlap=(a,b,rows)=>{
  let diff=0,weight=0;
  for(let y=0;y<rows;y+=1){
    const ay=a.h-rows+y;
    for(let x=0;x<Math.min(a.w,b.w);x+=2){
      const va=a.values[ay*a.w+x],vb=b.values[y*b.w+x],active=Math.max(va,vb);
      if(active<.08) continue;
      diff+=Math.abs(va-vb)*(0.5+active);weight+=(0.5+active);
    }
  }
  return weight?diff/weight:1;
};

const overlapPixels=(first,second)=>{
  const a=inkMap(first),b=inkMap(second);
  const min=Math.max(10,Math.floor(Math.min(a.h,b.h)*.05));
  const max=Math.floor(Math.min(a.h,b.h)*.52);
  let best={rows:0,score:1};
  for(let rows=min;rows<=max;rows+=2){
    const score=scoreOverlap(a,b,rows);
    if(score<best.score) best={rows,score};
  }
  if(best.score>.19) return 0;
  return Math.round(best.rows*(first.width/a.w));
};

export const stitchOfficialArticlePages=async(sources,{maxWidth=1800,quality=.92}={})=>{
  const usable=(sources||[]).filter(Boolean);
  if(!usable.length) throw new Error('No EA SPORTS Network article pages were provided.');
  const pages=[];
  for(const src of usable){
    const image=await loadImage(src);
    const raw=canvas(image.width,image.height);
    raw.getContext('2d').drawImage(image,0,0);
    if(typeof image.close==='function') image.close();
    pages.push(crop(raw,cropBounds(raw)));
  }
  const width=Math.min(maxWidth,Math.max(...pages.map(p=>p.width)));
  const normalized=pages.map(p=>resize(p,width));
  const overlaps=[];
  for(let i=1;i<normalized.length;i+=1) overlaps.push(overlapPixels(normalized[i-1],normalized[i]));
  const height=normalized.reduce((sum,p)=>sum+p.height,0)-overlaps.reduce((sum,n)=>sum+n,0);
  const stitched=canvas(width,height),ctx=stitched.getContext('2d');
  ctx.fillStyle='#f3f3f1';ctx.fillRect(0,0,width,height);
  let y=0;
  normalized.forEach((page,i)=>{if(i)y-=overlaps[i-1]||0;ctx.drawImage(page,0,y);y+=page.height});
  return {dataUrl:stitched.toDataURL('image/jpeg',quality),width,height,pageCount:normalized.length,overlaps};
};