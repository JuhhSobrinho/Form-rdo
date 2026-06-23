if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("../sw.js").catch(() => {});
}

document.addEventListener("DOMContentLoaded", () => {

    /* ===== PWA ===== */
    let deferredPrompt = null, waitingInstallFromToast = false;
    const ONE_DAY = 864e5;
    const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const shouldShowToast = () => { if (isInstalled()) return false; const l=localStorage.getItem("install_toast_last_show"); return !l||(Date.now()-Number(l))>ONE_DAY; };
    const showToast = () => { const el=document.getElementById("installToast"); if(!el)return; localStorage.setItem("install_toast_last_show",Date.now()); new bootstrap.Toast(el,{autohide:false}).show(); };
    window.addEventListener("beforeinstallprompt", async e => {
        e.preventDefault(); deferredPrompt=e;
        if (waitingInstallFromToast){deferredPrompt.prompt();waitingInstallFromToast=false;}
        if (shouldShowToast()) setTimeout(showToast,4000);
        const {outcome}=await deferredPrompt.userChoice;
        if(outcome==="accepted") localStorage.setItem("pwa_installed","true");
        deferredPrompt=null;
    });
    document.getElementById("installBtn")?.addEventListener("click",()=>{ if(!deferredPrompt){alert("Instalação indisponível no momento.");return;} deferredPrompt.prompt(); });
    document.getElementById("toastInstallBtn")?.addEventListener("click",e=>{ e.preventDefault(); if(!deferredPrompt){waitingInstallFromToast=true;e.target.innerText="Preparando...";return;} deferredPrompt.prompt(); });
    document.getElementById("closeInstallToast")?.addEventListener("click",()=>{ bootstrap.Toast.getInstance(document.getElementById("installToast"))?.hide(); });

    /* ===== TEMA ===== */
    const toggleLink = document.getElementById("toggleTheme");
    const applyTheme = (dark) => {
        document.body.classList.toggle("dark-mode", dark);
        document.body.classList.toggle("light-mode", !dark);
        if (toggleLink) toggleLink.textContent = dark ? "Ir para Modo Claro" : "Ir para Modo Escuro";
        localStorage.setItem("tema", dark ? "dark" : "light");
    };
    applyTheme(localStorage.getItem("tema") === "dark");
    toggleLink?.addEventListener("click", e => {
        e.preventDefault();
        applyTheme(!document.body.classList.contains("dark-mode"));
    });

    /* ===== VALIDAÇÃO VISUAL ===== */
    const form   = document.getElementById("formRelatorio");
    const inputs = document.querySelectorAll("#formRelatorio input.campo-obrigatorio, #formRelatorio select.campo-obrigatorio, #formRelatorio textarea.campo-obrigatorio");
    inputs.forEach(inp => inp.addEventListener("input", () => inp.style.border = "1px solid var(--cor-destaque)"));

    /* ===== AUTO-GROW TEXTAREA ===== */
    document.querySelectorAll(".tarefa-desc").forEach(ta => {
        ta.addEventListener("input", () => { ta.style.height="auto"; ta.style.height=ta.scrollHeight+"px"; });
    });

    /* ===== REVELAR TAREFAS ===== */
    for (let i=1; i<=12; i++) {
        const idx=String(i).padStart(2,"0"), next=String(i+1).padStart(2,"0");
        const ta=document.getElementById(`tarefa${idx}`), ng=document.getElementById(`grupo-tarefa${next}`);
        if(!ta||!ng) continue;
        ta.addEventListener("input",()=>{ if(ta.value.trim()) ng.classList.remove("d-none"); });
    }

    /* ===== REVELAR HORAS ===== */
    for (let i=1; i<=7; i++) {
        const idx=String(i).padStart(2,"0"), next=String(i+1).padStart(2,"0");
        const tec=document.getElementById(`tec${idx}`), ng=document.getElementById(`grupo-horas${next}`);
        if(!tec||!ng) continue;
        tec.addEventListener("input",()=>{ if(tec.value.trim()) ng.classList.remove("d-none"); });
    }

    /* ===== PREVIEW ASSINATURA ===== */
    document.getElementById("assinaturaTeam")?.addEventListener("change", e => {
        const file = e.target.files[0];
        const preview = document.getElementById("previewAssinatura");
        if (!file) { preview.innerHTML = "Pré-visualização da assinatura"; return; }
        const reader = new FileReader();
        reader.onload = ev => { preview.innerHTML = `<img src="${ev.target.result}" style="max-height:80px;max-width:100%;object-fit:contain;">`; };
        reader.readAsDataURL(file);
    });

    /* ===== REDUZIR IMAGEM ===== */
    function reduzirImagem(file, maxW=900, maxH=700) {
        return new Promise((resolve,reject) => {
            if(!file) return resolve(null);
            const img=new Image(), reader=new FileReader();
            reader.onload=()=>{ img.src=reader.result; };
            img.onload=()=>{
                const ratio=Math.min(maxW/img.width,maxH/img.height,1);
                const canvas=document.createElement("canvas");
                canvas.width=img.width*ratio; canvas.height=img.height*ratio;
                canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
                resolve(canvas.toDataURL("image/jpeg",0.72));
            };
            reader.onerror=reject;
            reader.readAsDataURL(file);
        });
    }

    /* ===== SUBMIT ===== */
    form.addEventListener("submit", async e => {
        e.preventDefault();

        let vazios=[];
        inputs.forEach(inp=>{ if(!inp.value.trim()){inp.style.border="2px solid red";vazios.push(inp);}else inp.style.border="1px solid var(--cor-destaque)"; });
        if(vazios.length){alert("Preencha todos os campos obrigatórios.");vazios[0].scrollIntoView({behavior:"smooth",block:"center"});return;}

        const setoresSel=document.querySelectorAll('input[name="tipoSetor"]:checked');
        if(!setoresSel.length){
            alert("Selecione ao menos um setor.");
            document.querySelectorAll('input[name="tipoSetor"]').forEach(cb=>cb.parentElement.style.border="2px solid red");
            return;
        }
        document.querySelectorAll('input[name="tipoSetor"]').forEach(cb=>cb.parentElement.style.border="none");

        // Tarefas
        const tarefas=[];
        for(let i=1;i<=13;i++){
            const idx=String(i).padStart(2,"0");
            const t=document.getElementById(`tarefa${idx}`)?.value.trim();
            const p=document.getElementById(`periodo${idx}`)?.value.trim();
            if(t) tarefas.push({descricao:t,periodo:p||""});
        }

        // Horas Homem (máx 8)
        const horasHomem=[];
        for(let i=1;i<=8;i++){
            const idx=String(i).padStart(2,"0");
            const tec=document.getElementById(`tec${idx}`)?.value.trim();
            if(!tec) continue;
            horasHomem.push({
                tecnico:tec,
                entrada:   document.getElementById(`entra${idx}`)?.value.trim()||"",
                almoco:    document.getElementById(`almoco${idx}`)?.value.trim()||"",
                saida:     document.getElementById(`saida${idx}`)?.value.trim()||"",
                extraEntra:document.getElementById(`extraEntra${idx}`)?.value.trim()||"",
                janta:     document.getElementById(`janta${idx}`)?.value.trim()||"",
                extraSai:  document.getElementById(`extraSai${idx}`)?.value.trim()||""
            });
        }

        // Fotos + descrições (máx 8)
        const fotosObj={};
        for(let i=1;i<=8;i++){
            fotosObj[`foto${i}`]      = await reduzirImagem(document.getElementById(`foto${i}`)?.files[0]);
            fotosObj[`desc_foto${i}`] = document.getElementById(`desc_foto${i}`)?.value.trim()||"";
        }

        // Assinatura Team
        const assinaturaTeam = await reduzirImagem(document.getElementById("assinaturaTeam")?.files[0], 400, 200);

        const dados = {
            nrdo:       document.getElementById("nrdo").value.trim(),
            emitido:    document.getElementById("emitido").value.trim(),
            tituloAtividade: document.getElementById("tituloAtividade")?.value.trim(),
            data:       document.getElementById("data").value,
            turno:      document.getElementById("turno").value,
            setores:    Array.from(setoresSel).map(cb=>cb.value),
            cliente:    document.getElementById("cliente").value.trim(),
            local:      document.getElementById("local").value.trim(),
            unidade:    document.getElementById("unidade").value.trim(),
            contato:    document.getElementById("contato").value.trim(),
            telContato: document.getElementById("telContato").value.trim(),
            ocCliente:  document.getElementById("ocCliente").value.trim(),
            osCliente:  document.getElementById("osCliente").value.trim(),
            osTeam:     document.getElementById("osTeam").value.trim(),
            tarefas,
            horasHomem,
            observacoes:document.getElementById("observacoes").value.trim(),
            assinaturaTeam,
            ...fotosObj
        };

        localStorage.setItem("dadosRdoSolda", JSON.stringify(dados));

        fetch("https://script.google.com/macros/s/AKfycbwqerEudE3ARyWcAGYuv16Tzho-P5enV9trSDZhoZO_MMLH26i1YcSaVm0x8IFqUyJT/exec",{
            method:"POST",mode:"no-cors",
            body:JSON.stringify({tipo:"RDO-SOLDA",nrdo:dados.nrdo,data:dados.data,cliente:dados.cliente,local:dados.local,unidade:dados.unidade,osTeam:dados.osTeam,setores:dados.setores.join(", "),emitido:dados.emitido,tarefas:dados.tarefas.map(t=>`${t.descricao}[${t.periodo}]`).join(" | "),equipe:dados.horasHomem.map(h=>`${h.tecnico}:E=${h.entrada}S=${h.saida}`).join(" | ")})
        }).catch(()=>{});

        window.open("../view/modelo/rdo-solda-modelo.html","_blank");
    });
});
