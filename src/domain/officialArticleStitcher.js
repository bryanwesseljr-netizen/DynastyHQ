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

const trimDarkFrame=(raw)=>{
  const sw=Math.min(520,raw.width),sh=Math.max(1,Math.round(raw.height*(sw/raw.width)));
  const sample=canvas(sw,sh),ctx=sample.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(raw,0,0,sw,sh);
  const px=ctx.getImageData(0,0,sw,sh).data;
  const dark=(x,y)=>{const i=(y*sw+x)*4;return lum(px[i],px[i+1],px[i+2])<48?1:0};

  const y0=Math.round(sh*.08),y1=Math.round(sh*.92);
  const x0=Math.round(sw*.06),x1=Math.round(sw*.94);

  const colRatio=(x)=>{
    let total=0,count=0;
    for(let y=y0;y<y1;y+=2){total+=dark(x,y);count+=1}
    return count?total/count:0;
  };
  const rowRatio=(y,left,right)=>{
    let total=0,count=0;
    for(let x=left;x<right;x+=2){total+=dark(x,y);count+=1}
    return count?total/count:0;
  };

  let left={pos:-1,score:0},right={pos:-1,score:0};
  for(let x=0;x<Math.round(sw*.22);x+=1){
    const score=colRatio(x);
    if(score>left.score) left={pos:x,score};
  }
  for(let x=Math.round(sw*.78);x<sw;x+=1){
    const score=colRatio(x);
    if(score>right.score) right={pos:x,score};
  }

  const innerLeft=left.score>.48 ? Math.min(sw-3,left.pos+3) : 0;
  const innerRight=right.score>.48 ? Math.max(innerLeft+2,right.pos-3) : sw-1;

  let top={pos:-1,score:0},bottom={pos:-1,score:0};
  for(let y=0;y<Math.round(sh*.22);y+=1){
    const score=rowRatio(y,Math.max(x0,innerLeft),Math.min(x1,innerRight));
    if(score>top.score) top={pos:y,score};
  }
  for(let y=Math.round(sh*.78);y<sh;y+=1){
    const score=rowRatio(y,Math.max(x0,innerLeft),Math.min(x1,innerRight));
    if(score>bottom.score) bottom={pos:y,score};
  }

  const innerTop=top.score>.62 ? Math.min(sh-3,top.pos+3) : 0;
  const innerBottom=bottom.score>.62 ? Math.max(innerTop+2,bottom.pos-3) : sh-1;

  if(innerLeft===0&&innerRight===sw-1&&innerTop===0&&innerBottom===sh-1) return raw;

  const sx=raw.width/sw,sy=raw.height/sh;
  const bounds={
    x:clamp(Math.round(innerLeft*sx),0,raw.width-2),
    y:clamp(Math.round(innerTop*sy),0,raw.height-2),
    width:clamp(Math.round((innerRight-innerLeft+1)*sx),2,raw.width),
    height:clamp(Math.round((innerBottom-innerTop+1)*sy),2,raw.height),
  };
  bounds.width=Math.min(bounds.width,raw.width-bounds.x);
  bounds.height=Math.min(bounds.height,raw.height-bounds.y);
  return crop(raw,bounds);
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
  let best=1;
  const width=Math.min(a.w,b.w);
  const xStart=Math.round(width*.08),xEnd=Math.round(width*.92);
  for(let shift=-3;shift<=3;shift+=1){
    let diff=0,weight=0;
    for(let y=0;y<rows;y+=1){
      const ay=a.h-rows+y;
      for(let x=xStart;x<xEnd;x+=2){
        const bx=x+shift;
        if(bx<0||bx>=b.w) continue;
        const va=a.values[ay*a.w+x],vb=b.values[y*b.w+bx],active=Math.max(va,vb);
        if(active<.07) continue;
        diff+=Math.abs(va-vb)*(0.45+active);
        weight+=(0.45+active);
      }
    }
    if(weight) best=Math.min(best,diff/weight);
  }
  return best;
};

const overlapPixels=(first,second)=>{
  const a=inkMap(first),b=inkMap(second);
  const min=Math.max(10,Math.floor(Math.min(a.h,b.h)*.04));
  const max=Math.floor(Math.min(a.h,b.h)*.82);
  let best={rows:0,score:1};
  for(let rows=min;rows<=max;rows+=2){
    const score=scoreOverlap(a,b,rows);
    if(score<best.score) best={rows,score};
  }
  if(best.score>.245) return 0;
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
    pages.push(trimDarkFrame(crop(raw,cropBounds(raw))));
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