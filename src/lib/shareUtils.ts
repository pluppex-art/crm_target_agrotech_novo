import * as htmlToImage from 'html-to-image';

export async function smartShareImage(element: HTMLElement, filename: string) {
  try {
    // Pequeno delay para garantir estabilidade da renderização
    await new Promise(resolve => setTimeout(resolve, 100));

    // Converter para Blob (melhor para clipboard e share nativo)
    const blob = await htmlToImage.toBlob(element, {
      quality: 1,
      backgroundColor: '#ffffff',
      pixelRatio: 2,
    });

    if (!blob) throw new Error('Falha ao gerar blob da imagem');

    const file = new File([blob], filename, { type: 'image/png' });

    // 1. Tentar Web Share API (Mobile Nativo)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Compartilhar',
        });
        return; // Sucesso no mobile
      } catch (err: any) {
        // Se o usuário fechar a gaveta do sistema
        if (err.name === 'AbortError') return;
        console.error('Erro no navigator.share:', err);
      }
    }

    // 2. Tentar Clipboard API (Desktop)
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        alert('✅ Imagem copiada! Vá no WhatsApp Web e aperte Ctrl+V (ou Cmd+V) para enviar.');
        return;
      } catch (err) {
        console.error('Erro ao copiar para área de transferência:', err);
      }
    }

    // 3. Fallback: Download tradicional se as APIs acima falharem
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Erro ao gerar imagem para compartilhamento:', error);
    alert('Não foi possível gerar a imagem no momento. Tente novamente.');
  }
}
