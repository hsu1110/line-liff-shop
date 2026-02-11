const t=(o,a=600)=>{if(!o||!o.includes("cloudinary.com"))return o;const e=`f_auto,q_auto,w_${a}`;return o.includes("/upload/")?o.replace("/upload/",`/upload/${e}/`):o};export{t as o};
