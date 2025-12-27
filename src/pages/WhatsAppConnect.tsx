import { useEffect } from 'react';

const WhatsAppConnect = () => {
  useEffect(() => {
    document.title = 'WhatsApp Multi Connect | MRO';
  }, []);

  return (
    <div className="w-full h-screen">
      <iframe
        src="/whatsapp-api/"
        className="w-full h-full border-0"
        title="WhatsApp Multi Connect"
        allow="camera; microphone"
      />
    </div>
  );
};

export default WhatsAppConnect;
