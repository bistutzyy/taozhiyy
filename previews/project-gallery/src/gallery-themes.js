export const GALLERY_THEME_STORAGE = 'taozhiyy.projects.theme.v1';

export const GALLERY_THEMES = [
  {id:'cosmos', label:'星空'},
  {id:'silver', label:'银白星图'},
];

const palettes = {
  cosmos: {
    id:'cosmos', clear:'#08090e', blending:'additive',
    stars:[
      {color:'#ffffff', size:.65, opacity:1},
      {color:'#ffffff', size:1.8, opacity:1},
      {color:'#ffffff', size:.43, opacity:.85},
    ],
    orbits:[{color:'#6e7489', opacity:.16}, {color:'#8a6174', opacity:.1}],
    coordinates:{color:'#6e7489', opacity:.16, visible:false},
    panel:{frame:'#333744', accent:'#acbfd3', screen:'#11141e', label:'#eef0f6', category:'#acbfd3'},
  },
  silver: {
    id:'silver', clear:'#edf1f4', blending:'normal',
    stars:[
      {color:'#33434c', size:.38, opacity:.92},
      {color:'#256e73', size:.85, opacity:.95},
      {color:'#54656e', size:.27, opacity:.68},
    ],
    orbits:[{color:'#527d83', opacity:.42}, {color:'#99677c', opacity:.3}],
    coordinates:{color:'#789095', opacity:.28, visible:true},
    panel:{frame:'#8b9da7', accent:'#286e73', screen:'#d8e1e7', label:'#253640', category:'#526b76'},
  },
};

export function resolveGalleryTheme(value) {
  return value === 'silver' ? 'silver' : 'cosmos';
}

export function getScenePalette(value) {
  return palettes[resolveGalleryTheme(value)];
}
