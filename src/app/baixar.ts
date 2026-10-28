/** Salva `dados` como arquivo JSON no computador (download local; nada vai para a rede). */
export function baixarJson(dados: unknown, nome = `match-do-saber-diagnostico-${new Date().toISOString().replace(/[:.]/g, '-')}.json`): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
