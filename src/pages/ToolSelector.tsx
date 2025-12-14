import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Instagram, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoMro from '@/assets/logo-mro.png';

const ToolSelector = () => {
  const navigate = useNavigate();
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  const tools = [
    {
      id: 'instagram',
      name: 'Ferramenta para Instagram',
      description: 'Análise de perfil, estratégias e criativos com I.A',
      icon: Instagram,
      color: 'from-pink-500 to-purple-600',
      hoverColor: 'hover:from-pink-600 hover:to-purple-700',
      borderColor: 'border-pink-500/30',
      path: '/instagram',
      badge: 'MRO I.A'
    },
    {
      id: 'whatsapp',
      name: 'Ferramenta para WhatsApp',
      description: 'Automação e gestão de conversas',
      icon: MessageCircle,
      color: 'from-green-500 to-emerald-600',
      hoverColor: 'hover:from-green-600 hover:to-emerald-700',
      borderColor: 'border-green-500/30',
      path: '/zapmro',
      badge: 'ZAP MRO'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <div className="mb-8 z-10">
        <img 
          src={logoMro} 
          alt="MRO" 
          className="h-20 md:h-24 object-contain drop-shadow-2xl"
        />
      </div>

      {/* Title */}
      <div className="text-center mb-12 z-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Escolha sua <span className="text-amber-400">Ferramenta</span>
        </h1>
        <p className="text-gray-400 text-lg">
          Selecione a plataforma que deseja acessar
        </p>
      </div>

      {/* Tool Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full z-10 px-4">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => navigate(tool.path)}
            onMouseEnter={() => setHoveredTool(tool.id)}
            onMouseLeave={() => setHoveredTool(null)}
            className={`
              relative group p-8 rounded-2xl border-2 ${tool.borderColor}
              bg-gray-800/50 backdrop-blur-sm
              transition-all duration-500 ease-out
              hover:scale-[1.02] hover:shadow-2xl
              ${hoveredTool === tool.id ? 'bg-gray-700/60' : ''}
            `}
          >
            {/* Gradient overlay on hover */}
            <div className={`
              absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10
              bg-gradient-to-r ${tool.color} transition-opacity duration-500
            `} />

            {/* Badge */}
            <div className={`
              absolute -top-3 right-4 px-4 py-1 rounded-full text-xs font-bold
              bg-gradient-to-r ${tool.color} text-white shadow-lg
            `}>
              {tool.badge}
            </div>

            {/* Icon */}
            <div className={`
              w-16 h-16 rounded-xl bg-gradient-to-r ${tool.color}
              flex items-center justify-center mb-6
              group-hover:scale-110 transition-transform duration-300
              shadow-lg
            `}>
              <tool.icon className="w-8 h-8 text-white" />
            </div>

            {/* Content */}
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2 text-left">
              {tool.name}
            </h2>
            <p className="text-gray-400 text-left">
              {tool.description}
            </p>

            {/* Arrow indicator */}
            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
          </button>
        ))}
      </div>

      {/* Footer text */}
      <p className="mt-12 text-gray-500 text-sm z-10">
        Mais Resultados Online © 2024
      </p>
    </div>
  );
};

export default ToolSelector;
