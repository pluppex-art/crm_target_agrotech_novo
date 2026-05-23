import { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export function useExportPDF() {
  const [isExporting, setIsExporting] = useState(false);

  const exportElementToPDF = async (elementId: string, filename: string = 'relatorio.pdf') => {
    setIsExporting(true);
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Elemento com ID ${elementId} não encontrado.`);
      }

      // Capture the element as canvas
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Calculate PDF dimensions (A4 size)
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = imgProps.width / imgProps.height;
      
      let width = pdfWidth;
      let height = pdfWidth / ratio;

      if (height > pdfHeight) {
        height = pdfHeight;
        width = height * ratio;
      }

      // Add image to PDF
      const x = (pdfWidth - width) / 2;
      const y = 20; // 20px padding top
      
      pdf.addImage(imgData, 'PNG', x, y, width, height);
      
      // Save PDF
      pdf.save(filename);
      
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  return { exportElementToPDF, isExporting };
}
