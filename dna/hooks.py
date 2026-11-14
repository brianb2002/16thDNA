"""Surface hooks for the Holodex room: every blanked surface calls window.DNA_PAINT(kind, id, g, W, H, sf)
   after its glass background is drawn, so 16th DNA can paint into the exact room layout."""
H = "try{window.DNA_PAINT&&window.DNA_PAINT(%s)}catch(e){console.warn('DNA paint',e)}"
def rep(s, a, b, n=1):
    assert s.count(a) == n, (s.count(a), a[:90]); return s.replace(a, b)
def add_hooks(t):
    t = rep(t, "g.save();panelBG(g,W,H,S.sel===s.id);g.restore();s.t.needsUpdate=true;return;/*SHELL: station blanked*/",
            "g.save();panelBG(g,W,H,S.sel===s.id);g.restore();" + H % "'station',s.id,g,W,H,s" + ";s.t.needsUpdate=true;return;/*SHELL: station blanked*/")
    t = rep(t, "panelBG(g,320,240,S.sel==='sym:'+x.s||!!(GRAB&&GRAB.kind==='ring'));g.restore();o.t.needsUpdate=true;return;/*SHELL: ring tile blanked*/",
            "panelBG(g,320,240,S.sel==='sym:'+x.s||!!(GRAB&&GRAB.kind==='ring'));g.restore();" + H % "'tile',tiles.indexOf(o),g,320,240,o" + ";o.t.needsUpdate=true;return;/*SHELL: ring tile blanked*/")
    t = rep(t, "panelBG(g,W,H,S.sel==='ticket');g.restore();TKS.t.needsUpdate=true;return;", "panelBG(g,W,H,S.sel==='ticket');g.restore();" + H % "'ticket','ticket',g,W,H,TKS" + ";TKS.t.needsUpdate=true;return;")
    for k, sel in [("chart", "chartpad"), ("order", "orderpad"), ("ctrl", "ctrlpad")]:
        t = rep(t, "panelBG(g,W,H,S.sel==='%s');g.restore();sf.t.needsUpdate=true;return;" % sel, "panelBG(g,W,H,S.sel==='%s');g.restore();" % sel + H % ("'pad','%s',g,W,H,sf" % k) + ";sf.t.needsUpdate=true;return;")
    t = rep(t, "panelBG(g,W,H,S.sel==='watch');g.restore();WL.t.needsUpdate=true;return;", "panelBG(g,W,H,S.sel==='watch');g.restore();" + H % "'watch','watch',g,W,H,WL" + ";WL.t.needsUpdate=true;return;")
    t = rep(t, "panelBG(g,W,H,S.sel==='signals');g.restore();SG.t.needsUpdate=true;return;", "panelBG(g,W,H,S.sel==='signals');g.restore();" + H % "'signals','signals',g,W,H,SG" + ";SG.t.needsUpdate=true;return;")
    t = rep(t, "g.fillStyle=P.glass2;g.fillRect(0,0,W,H);tickT.needsUpdate=true;return;", "g.fillStyle=P.glass2;g.fillRect(0,0,W,H);" + H % "'ring','ring',g,W,H,null" + ";tickT.needsUpdate=true;return;")
    t = rep(t, "panelBG(g,wp.c.width,wp.c.height,S.sel===wp.id);/*SHELL: wall panel content blanked - glowing background only*/",
            "panelBG(g,wp.c.width,wp.c.height,S.sel===wp.id);" + H % "'wall',wp.id,g,wp.c.width,wp.c.height,wp")
    t = rep(t, "panelBG(g,rp.c.width,rp.c.height,S.sel===rp.id);/*SHELL: desk-row content blanked*/",
            "rp.btns=[];panelBG(g,rp.c.width,rp.c.height,S.sel===rp.id);" + H % "'row',rp.id,g,rp.c.width,rp.c.height,rp")
    return t
