#!/usr/bin/env node
const { readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { resolve, join, dirname, basename } = require('node:path');
const assert = require('node:assert/strict');
const fixturePath = resolve(process.argv[2] || '');
assert(process.argv[2], 'Usage: node test/native/report.cjs /absolute/native/fixture.json /absolute/output/index.html');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
assert.equal(fixture.contract, 'simplesst.native.e2e');
const destination = resolve(process.argv[3] || join(dirname(fixturePath), 'index.html'));
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function files(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((item) => item.isDirectory() ? files(join(directory, item.name)) : [join(directory, item.name)]);
}
const runs = [];
for (const platform of ['ios', 'android']) for (const profile of ['normal', 'protected']) {
  const directory = join(dirname(fixturePath), platform, profile);
  if (!existsSync(join(directory, 'summary.json'))) continue;
  for (const result of JSON.parse(readFileSync(join(directory, 'summary.json'), 'utf8'))) {
    const flow = join(directory, result.flow);
    const newest = new Map();
    for (const file of files(flow).filter((file) => /\/(takeScreenshot|startRecording)\//.test(file) && /\.(png|mp4)$/.test(file))) {
      const key = basename(file);
      if (!newest.has(key) || statSync(newest.get(key)).mtimeMs < statSync(file).mtimeMs) newest.set(key, file);
    }
    runs.push({ ...result, directory: flow, media: [...newest.values()] });
  }
}
const expected = 20;
const passed = runs.filter((run) => run.passed === true).length;
const titles = {
  '01-login-download': 'Entrar e baixar a visita',
  '02-default-date': 'Manter data e motivo após reiniciar',
  '03-continue-without-refresh': 'Continuar a visita sem atualizar',
  '04-restart-unavailable': 'Preservar a edição com o serviço indisponível',
  '05-sync-pending': 'Sincronizar e conferir o cadastro no servidor',
  '06-recovery': 'Recuperar a visita inteira após falha de sincronização',
  '07-protected-risks': 'Pedir decisão para riscos já enviados',
  '08-batch-exception': 'Aplicar data em lote e uma exceção por item',
};
const cards = runs.map((run) => {
  const success = run.passed === true;
  return `<section><h2>${escape(run.platform === 'ios' ? 'iPhone / iOS' : 'Android')} · ${escape(run.profile === 'protected' ? 'Após envio aceito' : 'Visita comum')}</h2>
    <h3><span class="${success ? 'pass' : 'fail'}">${success ? 'Aprovado' : 'Falhou'}</span> · ${escape(titles[run.flow] || run.flow)}</h3>
    <small>${escape(run.flow)}</small>
    <p><a href="${escape(join(run.directory, 'maestro.log'))}">Log</a> · <a href="${escape(join(run.directory, 'results.xml'))}">JUnit</a> · <a href="${escape(join(run.directory, 'server-status.json'))}">Conferência da API e banco</a></p>
    ${run.verificationError ? `<p class="fail">${escape(run.verificationError)}</p>` : ''}
    <div class="media">${run.media.map((path) => path.endsWith('.mp4') ? `<figure><video controls preload="none" src="${escape(path)}"></video><figcaption>${escape(basename(path))}</figcaption></figure>` : `<figure><a href="${escape(path)}"><img loading="lazy" src="${escape(path)}" alt="${escape(basename(path))}"></a><figcaption>${escape(basename(path))}</figcaption></figure>`).join('')}</div></section>`;
}).join('');
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SimpleSST · Testes nativos</title><style>
body{margin:0;background:#f3f6f9;color:#20364d;font:16px/1.6 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:28px 20px}h1{font-size:30px;line-height:1.2}h2{font-size:18px}h3{font-size:16px}section{background:white;padding:22px;margin:24px 0;border-radius:14px;border:1px solid #d7e1eb}.notice{padding:18px;background:#e7f0f8;border-radius:12px}a{color:#285b84}.pass{color:#187447}.fail{color:#a12d27}.media{display:flex;gap:18px;overflow-x:auto;align-items:flex-start}figure{margin:0;min-width:240px;max-width:330px}img,video{width:280px;max-height:620px;object-fit:contain;background:#edf2f7;border:1px solid #d9e3ec;border-radius:10px}figcaption{font-size:12px;overflow-wrap:anywhere}small{color:#61758a}
</style><main><h1>Validação nativa do SimpleSST</h1><p>${passed}/${expected} execuções previstas aprovadas nesta rodada; ${runs.length} resultados registrados.</p><div class="notice">Capturas e vídeos reais de simuladores, com dados fictícios e API/PostgreSQL descartáveis. Os serviços externos de armazenamento e eSocial são sintéticos. Estes testes não comprovam câmera/microfone físicos, atualização sobre um app já instalado em aparelho ou trabalho em segundo plano.</div>${cards}<small>Gerado em ${escape(new Date().toISOString())}. Sem certificado ou dado de produção.</small></main></html>`);
console.log(destination);
