/* =========================================================================
   Generador de PDF de cotizacion — formato Hidroval
   Escribe el PDF a mano, sin librerias: la app tiene que funcionar sin
   internet y el entorno no permite descargar paquetes.
   Expone window.generarCotizacionPDF(datos) -> Blob
   ========================================================================= */
(function(){
"use strict";

/* ---------- Anchos Helvetica (unidades de 1000) ---------- */
const W_N = {32:278,33:278,34:355,35:556,36:556,37:889,38:667,39:191,40:333,41:333,42:389,
  43:584,44:278,45:333,46:278,47:278,58:278,59:278,60:584,61:584,62:584,63:556,64:1015,
  65:667,66:667,67:722,68:722,69:667,70:611,71:778,72:722,73:278,74:500,75:667,76:556,
  77:833,78:722,79:778,80:667,81:778,82:722,83:667,84:611,85:722,86:667,87:944,88:667,
  89:667,90:611,91:278,92:278,93:278,94:469,95:556,96:333,97:556,98:556,99:500,100:556,
  101:556,102:278,103:556,104:556,105:222,106:222,107:500,108:222,109:833,110:556,111:556,
  112:556,113:556,114:333,115:500,116:278,117:556,118:500,119:722,120:500,121:500,122:500,
  123:334,124:260,125:334,126:584,176:400,186:365,170:370,188:834,189:834,190:834,
  191:611,161:333,171:556,187:556,183:350,151:1000,150:556,145:222,146:222,147:333,148:333};
const W_B = {32:278,33:333,34:474,35:556,36:556,37:889,38:722,39:238,40:333,41:333,42:389,
  43:584,44:278,45:333,46:278,47:278,58:333,59:333,60:584,61:584,62:584,63:611,64:975,
  65:722,66:722,67:722,68:722,69:667,70:611,71:778,72:722,73:278,74:556,75:722,76:611,
  77:833,78:722,79:778,80:667,81:778,82:722,83:667,84:611,85:722,86:667,87:944,88:667,
  89:667,90:611,91:333,92:278,93:333,94:584,95:556,96:333,97:556,98:611,99:556,100:611,
  101:556,102:333,103:611,104:611,105:278,106:278,107:556,108:278,109:889,110:611,111:611,
  112:611,113:611,114:389,115:556,116:333,117:611,118:556,119:778,120:556,121:556,122:500,
  123:389,124:280,125:389,126:584,176:400,186:400,170:400,188:834,189:834,190:834,
  191:611,161:333,171:556,187:556,183:350,151:1000,150:556,145:278,146:278,147:500,148:500};
/* letras acentuadas: mismo ancho que su letra base */
const BASE = {192:65,193:65,194:65,195:65,196:65,197:65,199:67,200:69,201:69,202:69,203:69,
  204:73,205:73,206:73,207:73,209:78,210:79,211:79,212:79,213:79,214:79,217:85,218:85,
  219:85,220:85,221:89,224:97,225:97,226:97,227:97,228:97,229:97,231:99,232:101,233:101,
  234:101,235:101,236:105,237:105,238:105,239:105,241:110,242:111,243:111,244:111,245:111,
  246:111,249:117,250:117,251:117,252:117,253:121,255:121};

/* ---------- Texto a WinAnsi ---------- */
const ESP = {0x2013:150,0x2014:151,0x2018:145,0x2019:146,0x201C:147,0x201D:148,0x2022:183,
  0x20AC:128,0x2026:133,0x2122:153};
function aWinAnsi(txt){
  const out = [];
  for(const ch of String(txt == null ? "" : txt)){
    const cp = ch.codePointAt(0);
    if(cp >= 32 && cp <= 126) out.push(cp);
    else if(ESP[cp]) out.push(ESP[cp]);
    else if(cp >= 160 && cp <= 255) out.push(cp);
    else if(cp === 9) out.push(32);
    else if(cp > 126) out.push(63);           // '?' para lo que no existe en WinAnsi
  }
  return out;
}
function ancho(txt, tam, negrita){
  const tabla = negrita ? W_B : W_N;
  let t = 0;
  for(const c of aWinAnsi(txt)){
    const k = tabla[c] !== undefined ? tabla[c]
            : (BASE[c] !== undefined ? tabla[BASE[c]] : undefined);
    t += (k === undefined ? (negrita ? 611 : 556) : k);
  }
  return t * tam / 1000;
}
function cadenaPDF(txt){
  let s = "";
  for(const c of aWinAnsi(txt)){
    if(c === 40 || c === 41 || c === 92) s += "\\" + String.fromCharCode(c);
    else if(c < 32 || c > 126) s += "\\" + ("000" + c.toString(8)).slice(-3);
    else s += String.fromCharCode(c);
  }
  return "(" + s + ")";
}
function cortar(txt, maxAncho, tam, negrita){
  const palabras = String(txt == null ? "" : txt).split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = "";
  for(let p of palabras){
    while(ancho(p, tam, negrita) > maxAncho && p.length > 1){   // palabra mas larga que la celda
      let corte = p.length;
      while(corte > 1 && ancho(p.slice(0, corte), tam, negrita) > maxAncho) corte--;
      if(actual){ lineas.push(actual); actual = ""; }
      lineas.push(p.slice(0, corte));
      p = p.slice(corte);
    }
    const tentativa = actual ? actual + " " + p : p;
    if(ancho(tentativa, tam, negrita) <= maxAncho) actual = tentativa;
    else { if(actual) lineas.push(actual); actual = p; }
  }
  if(actual) lineas.push(actual);
  return lineas.length ? lineas : [""];
}

/* ---------- Hoja y medidas (puntos) ---------- */
const AN = 612, AL = 792;          // carta
const MX = 42;                     // margen izquierdo y derecho
const ANCHO_CAJA = AN - 2 * MX;    // 528
const MY_SUP = 34, MY_INF = 34;
const COLS = [38, 252, 30, 52, 72, 84];   // No, DESCRIPCION, UND, CANT, V.UNIT, V.TOTAL
const SUMA_COLS = COLS.reduce((a,b)=>a+b, 0);
const ESCALA = ANCHO_CAJA / SUMA_COLS;
const CW = COLS.map(c => c * ESCALA);
const CX = CW.reduce((acc,w)=>{ acc.push(acc[acc.length-1] + w); return acc; }, [MX]);

const T_CAB = 8, T_CUERPO = 7.6, T_DATOS = 8.5, T_COND = 8, T_TOT = 8.5;
const INTERLINEA = 9.2, PAD = 3.5;

const AZUL = "0.12 0.31 0.49", NEGRO = "0 0 0", GRIS_L = "0.86 0.89 0.93";

/* ---------- Constructor de contenido ---------- */
function Lienzo(){
  this.ops = [];
}
Lienzo.prototype.texto = function(t, x, y, tam, fuente, color){
  if(t === "" || t == null) return;
  this.ops.push("BT /"+(fuente||"F1")+" "+tam+" Tf "+(color||NEGRO)+" rg "+
                x.toFixed(2)+" "+(AL - y).toFixed(2)+" Td "+cadenaPDF(t)+" Tj ET");
};
Lienzo.prototype.textoDer = function(t, xDer, y, tam, fuente, color){
  const neg = (fuente === "F2" || fuente === "F4");
  this.texto(t, xDer - ancho(t, tam, neg), y, tam, fuente, color);
};
Lienzo.prototype.textoCen = function(t, xCen, y, tam, fuente, color){
  const neg = (fuente === "F2" || fuente === "F4");
  this.texto(t, xCen - ancho(t, tam, neg)/2, y, tam, fuente, color);
};
Lienzo.prototype.caja = function(x, y, w, h, relleno, borde, grosor){
  let s = "";
  if(relleno) s += relleno + " rg ";
  if(borde)   s += borde + " RG ";
  s += (grosor || 0.6) + " w " + x.toFixed(2)+" "+(AL - y - h).toFixed(2)+" "+
       w.toFixed(2)+" "+h.toFixed(2)+" re " + (relleno && borde ? "B" : relleno ? "f" : "S");
  this.ops.push(s);
};
Lienzo.prototype.linea = function(x1, y1, x2, y2, grosor, color){
  this.ops.push((color||NEGRO)+" RG "+(grosor||0.6)+" w "+
    x1.toFixed(2)+" "+(AL-y1).toFixed(2)+" m "+x2.toFixed(2)+" "+(AL-y2).toFixed(2)+" l S");
};
Lienzo.prototype.imagen = function(nombre, x, y, w, h){
  this.ops.push("q "+w.toFixed(2)+" 0 0 "+h.toFixed(2)+" "+x.toFixed(2)+" "+
    (AL - y - h).toFixed(2)+" cm /"+nombre+" Do Q");
};
Lienzo.prototype.texto_ = function(){ return this.ops.join("\n"); };

/* ---------- Armado del documento ---------- */
function generarCotizacionPDF(d){
  const M = window.MEMBRETE || {};
  const hayEnc = !!(M.encabezado && M.encabezado.jpg);
  const hayPie = !!(M.pie && M.pie.jpg);
  const altoEnc = hayEnc ? ANCHO_CAJA * M.encabezado.h / M.encabezado.w : 0;
  const altoPie = hayPie ? ANCHO_CAJA * M.pie.h / M.pie.w : 0;

  const items = d.items || [];
  const paginas = [];
  let L = new Lienzo(), y = MY_SUP, inicioCaja = MY_SUP;

  /* --- encabezado de la primera pagina --- */
  if(hayEnc){ L.imagen("Im1", MX, y, ANCHO_CAJA, altoEnc); y += altoEnc; }

  /* --- bloque de datos --- */
  const filaDato = 13.5;
  const yDatos = y;
  const etiquetas = [
    ["FECHA", d.fecha, "COTIZACION", d.cotizacion],
    ["CLIENTE:", d.cliente, "TELEFONO", d.telefono],
    ["NIT:", d.nit, "", ""],
    ["CIUDAD:", d.ciudad, "", ""]
  ];
  if(d.atencion) etiquetas.splice(2, 0, ["ATENCION", d.atencion, "", ""]);
  etiquetas.forEach((f, i) => {
    const yf = yDatos + i * filaDato;
    L.texto(f[0], MX + 4, yf + 9.6, T_DATOS, "F2");
    L.texto(f[1], MX + 72, yf + 9.6, T_DATOS, "F1");
    if(f[2]){
      L.texto(f[2], CX[4] - 36, yf + 9.6, T_DATOS, "F2");
      L.texto(f[3], CX[5] + 6, yf + 9.6, T_DATOS, "F1");
    }
  });
  y = yDatos + etiquetas.length * filaDato;
  L.linea(MX, yDatos, MX + ANCHO_CAJA, yDatos, 0.8);
  L.linea(MX, y, MX + ANCHO_CAJA, y, 0.8);

  /* --- cabecera de la tabla --- */
  const altoCab = 16;
  L.caja(MX, y, ANCHO_CAJA, altoCab, GRIS_L, NEGRO, 0.6);
  const titulos = ["No.", "DESCRIPCION", "UND", "CANT", "VALOR UNIT", "VALOR TOTAL"];
  titulos.forEach((t, i) => L.textoCen(t, CX[i] + CW[i]/2, y + 11, T_CAB, "F2"));
  for(let i = 1; i < 6; i++) L.linea(CX[i], y, CX[i], y + altoCab, 0.6);
  y += altoCab;

  const limiteInf = AL - MY_INF;
  const cerrarPagina = () => {
    L.caja(MX, inicioCaja, ANCHO_CAJA, y - inicioCaja, null, NEGRO, 0.9);
    paginas.push(L);
  };
  const nuevaPagina = () => {
    cerrarPagina();
    L = new Lienzo(); y = MY_SUP; inicioCaja = MY_SUP;
  };

  /* --- titulo del proyecto --- */
  if(d.titulo){
    const lt = cortar(String(d.titulo).toUpperCase(), CW[1] - 2*PAD, T_CUERPO + 0.6, true);
    const h = Math.max(lt.length * (INTERLINEA + 1) + 4, 15);
    if(y + h > limiteInf - 40) nuevaPagina();
    L.caja(MX, y, ANCHO_CAJA, h, null, NEGRO, 0.6);
    for(let i = 1; i < 6; i++) L.linea(CX[i], y, CX[i], y + h, 0.6);
    lt.forEach((ln, k) => L.texto(ln, CX[1] + PAD, y + 10.5 + k*(INTERLINEA + 1), T_CUERPO + 0.6, "F2", AZUL));
    y += h;
  }

  /* --- filas --- */
  items.forEach((it, idx) => {
    const lineas = cortar(it.descripcion, CW[1] - 2*PAD, T_CUERPO, false);
    const alto = Math.max(lineas.length * INTERLINEA + 2*PAD, 18);
    if(y + alto > limiteInf - 4) nuevaPagina();
    L.caja(MX, y, ANCHO_CAJA, alto, null, NEGRO, 0.6);
    for(let i = 1; i < 6; i++) L.linea(CX[i], y, CX[i], y + alto, 0.6);
    const centro = y + alto/2 + T_CUERPO/3;
    L.textoCen(String(idx + 1), CX[0] + CW[0]/2, centro, T_CUERPO, "F1");
    lineas.forEach((ln, k) => L.texto(ln, CX[1] + PAD, y + PAD + 7 + k*INTERLINEA, T_CUERPO, "F1"));
    L.textoCen(it.und || "und", CX[2] + CW[2]/2, centro, T_CUERPO, "F1");
    L.textoCen(it.cant, CX[3] + CW[3]/2, centro, T_CUERPO, "F1");
    L.texto("$", CX[4] + PAD, centro, T_CUERPO, "F1");
    L.textoDer(it.unit, CX[5] - PAD, centro, T_CUERPO, "F1");
    L.textoDer("$ " + it.total, CX[6] - PAD, centro, T_CUERPO, "F1");
    y += alto;
  });

  /* --- totales --- */
  const filasTot = [["SUBTOTAL", d.subtotal], ["IVA " + (d.ivaPct || 19) + "%", d.iva], ["TOTAL", d.total]];
  const altoTot = 14;
  if(y + filasTot.length * altoTot > limiteInf - 4) nuevaPagina();
  filasTot.forEach(f => {
    L.caja(CX[4], y, CW[4] + CW[5], altoTot, GRIS_L, NEGRO, 0.6);
    L.linea(CX[5], y, CX[5], y + altoTot, 0.6);
    L.textoCen(f[0], CX[4] + CW[4]/2, y + 9.8, T_TOT, "F2");
    L.texto("$", CX[5] + PAD, y + 9.8, T_TOT, "F2");
    L.textoDer(f[1], CX[6] - PAD, y + 9.8, T_TOT, "F2");
    y += altoTot;
  });

  /* --- condiciones comerciales --- */
  const c = d.condiciones || {};
  const cond = [
    ["FORMA DE PAGO: ", c.pago], ["TIEMPO DE ENTREGA: ", c.entrega],
    ["VALIDEZ DE LA OFERTA: ", c.validez], ["DESCUENTO: ", c.descuento],
    ["MATERIAL PUESTO: ", c.material]
  ].filter(x => x[1]);
  const firma = d.firma || {};
  const altoCond = 8 + cond.length * 11 + 26 + (firma.nombre ? 22 : 0);
  if(y + altoCond + (hayPie ? altoPie : 0) > limiteInf) nuevaPagina();
  y += 7;
  cond.forEach(f => {
    const lineas = cortar(f[0] + f[1], ANCHO_CAJA - 12, T_COND, true);
    lineas.forEach((ln, k) => L.texto(ln, MX + 5, y + 8 + k*10, T_COND, "F4"));
    y += lineas.length * 10 + 1;
  });
  y += 12;
  L.texto("CORDIALMENTE,", MX + 5, y + 8, T_COND, "F4");
  y += 20;
  if(firma.nombre){
    L.texto(String(firma.nombre).toUpperCase(), MX + 5, y + 8, T_COND, "F4");
    y += 11;
    if(firma.cargo){ L.texto(String(firma.cargo).toUpperCase(), MX + 5, y + 8, T_COND, "F4"); y += 11; }
  }
  y += 10;

  /* --- pie --- */
  if(hayPie){
    if(y + altoPie > limiteInf) nuevaPagina();
    const yPie = Math.max(y, limiteInf - altoPie);
    L.imagen("Im2", MX, yPie, ANCHO_CAJA, altoPie);
    y = yPie + altoPie;
  }
  cerrarPagina();

  return ensamblar(paginas, hayEnc, hayPie, d);
}

/* ---------- Bytes del PDF ---------- */
function bytesDeTexto(s){
  const u = new Uint8Array(s.length);
  for(let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 0xFF;
  return u;
}
function bytesDeB64(b64){
  const bin = atob(b64), u = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

function ensamblar(paginas, hayEnc, hayPie, d){
  const M = window.MEMBRETE || {};
  const partes = [], offsets = [];
  let largo = 0;
  const empujar = u => { partes.push(u); largo += u.length; };
  const empujarTexto = s => empujar(bytesDeTexto(s));

  empujarTexto("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  const objetos = [];   // funciones que escriben cada objeto
  const nPag = paginas.length;
  const idCat = 1, idPages = 2;
  const idFuente = 3;                 // 3,4,5,6
  const idIm1 = 7, idIm2 = 8;
  const idPagina = 9;                 // 9 .. 9+nPag-1
  const idCont = idPagina + nPag;     // contenidos

  const hijos = [];
  for(let i = 0; i < nPag; i++) hijos.push((idPagina + i) + " 0 R");

  objetos[idCat] = "<< /Type /Catalog /Pages "+idPages+" 0 R >>";
  objetos[idPages] = "<< /Type /Pages /Count "+nPag+" /Kids ["+hijos.join(" ")+"] >>";
  const fuentes = ["Helvetica","Helvetica-Bold","Helvetica-Oblique","Helvetica-BoldOblique"];
  fuentes.forEach((f, i) => {
    objetos[idFuente + i] = "<< /Type /Font /Subtype /Type1 /BaseFont /"+f+
                            " /Encoding /WinAnsiEncoding >>";
  });

  let recursosXObj = "";
  if(hayEnc) recursosXObj += "/Im1 "+idIm1+" 0 R ";
  if(hayPie) recursosXObj += "/Im2 "+idIm2+" 0 R ";
  const recursos = "<< /Font << /F1 "+idFuente+" 0 R /F2 "+(idFuente+1)+" 0 R "+
                   "/F3 "+(idFuente+2)+" 0 R /F4 "+(idFuente+3)+" 0 R >>"+
                   (recursosXObj ? " /XObject << "+recursosXObj+">>" : "")+" >>";

  for(let i = 0; i < nPag; i++){
    objetos[idPagina + i] = "<< /Type /Page /Parent "+idPages+" 0 R /MediaBox [0 0 "+AN+" "+AL+"] "+
      "/Resources "+recursos+" /Contents "+(idCont + i)+" 0 R >>";
  }

  /* escribir objetos simples */
  const escribir = (num, cuerpo) => {
    offsets[num] = largo;
    empujarTexto(num + " 0 obj\n" + cuerpo + "\nendobj\n");
  };
  const escribirStream = (num, dic, datos) => {
    offsets[num] = largo;
    empujarTexto(num + " 0 obj\n" + dic + "\nstream\n");
    empujar(datos);
    empujarTexto("\nendstream\nendobj\n");
  };

  escribir(idCat, objetos[idCat]);
  escribir(idPages, objetos[idPages]);
  for(let i = 0; i < 4; i++) escribir(idFuente + i, objetos[idFuente + i]);
  if(hayEnc){
    const b = bytesDeB64(M.encabezado.jpg);
    escribirStream(idIm1, "<< /Type /XObject /Subtype /Image /Width "+M.encabezado.w+
      " /Height "+M.encabezado.h+" /ColorSpace /DeviceRGB /BitsPerComponent 8 "+
      "/Filter /DCTDecode /Length "+b.length+" >>", b);
  }
  if(hayPie){
    const b = bytesDeB64(M.pie.jpg);
    escribirStream(idIm2, "<< /Type /XObject /Subtype /Image /Width "+M.pie.w+
      " /Height "+M.pie.h+" /ColorSpace /DeviceRGB /BitsPerComponent 8 "+
      "/Filter /DCTDecode /Length "+b.length+" >>", b);
  }
  for(let i = 0; i < nPag; i++) escribir(idPagina + i, objetos[idPagina + i]);
  for(let i = 0; i < nPag; i++){
    const b = bytesDeTexto(paginas[i].texto_());
    escribirStream(idCont + i, "<< /Length "+b.length+" >>", b);
  }

  /* info */
  const idInfo = idCont + nPag;
  escribir(idInfo, "<< /Title "+cadenaPDF("Cotizacion "+(d.cotizacion||""))+
    " /Author "+cadenaPDF(d.empresa || "Hidroval S.A.S.")+" /Producer "+cadenaPDF("Ventas en Ruta")+" >>");

  /* xref */
  const total = idInfo + 1;
  const inicioXref = largo;
  let xref = "xref\n0 "+total+"\n0000000000 65535 f \n";
  for(let i = 1; i < total; i++){
    xref += ("0000000000" + (offsets[i] || 0)).slice(-10) + " 00000 n \n";
  }
  xref += "trailer\n<< /Size "+total+" /Root "+idCat+" 0 R /Info "+idInfo+" 0 R >>\nstartxref\n"+
          inicioXref+"\n%%EOF\n";
  empujarTexto(xref);

  const salida = new Uint8Array(largo);
  let p = 0;
  for(const u of partes){ salida.set(u, p); p += u.length; }
  return new Blob([salida], {type:"application/pdf"});
}

window.generarCotizacionPDF = generarCotizacionPDF;
})();
