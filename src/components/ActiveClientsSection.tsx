import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';

interface ActiveClient {
  username: string;
  profilePicture: string;
  followers: number;
}

interface ActiveClientsSectionProps {
  title?: string;
  maxClients?: number;
  className?: string;
}

const formatFollowers = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toLocaleString('pt-BR');
};

export default function ActiveClientsSection({ 
  title = "Clientes Ativos", 
  maxClients = 20,
  className = ""
}: ActiveClientsSectionProps) {
  const [clients, setClients] = useState<ActiveClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-active-clients');
        
        if (!error && data?.success && data?.clients) {
          setClients(data.clients.slice(0, maxClients));
        }
      } catch (err) {
        console.error('Error fetching active clients:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [maxClients]);

  if (isLoading) {
    return (
      <div className={`py-8 ${className}`}>
        <div className="flex items-center justify-center gap-2 mb-6">
          <Users className="w-6 h-6 text-yellow-400" />
          <h3 className="text-xl md:text-2xl font-bold text-white">{title}</h3>
        </div>
        <div className="flex justify-center">
          <div className="animate-pulse flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-16 h-16 bg-gray-700 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return null;
  }

  return (
    <div className={`py-8 ${className}`}>
      <div className="flex items-center justify-center gap-2 mb-6">
        <Users className="w-6 h-6 text-yellow-400" />
        <h3 className="text-xl md:text-2xl font-bold text-white">{title}</h3>
        <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-sm font-medium">
          {clients.length}+
        </span>
      </div>
      
      <div className="overflow-hidden">
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 max-w-4xl mx-auto px-4">
          {clients.map((client, index) => (
            <div 
              key={client.username}
              className="flex flex-col items-center group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-yellow-400/50 group-hover:border-yellow-400 transition-all duration-300 group-hover:scale-110">
                  {client.profilePicture ? (
                    <img 
                      src={`https://images.weserv.nl/?url=${encodeURIComponent(client.profilePicture)}&w=128&h=128&fit=cover`}
                      alt={client.username}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${client.username}&background=EAB308&color=000&size=128`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-black font-bold text-lg">
                      {client.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-gray-900" title="Ativo" />
              </div>
              
              <div className="mt-2 text-center">
                <p className="text-xs text-gray-300 truncate max-w-[70px] md:max-w-[80px]">
                  @{client.username}
                </p>
                <p className="text-xs text-yellow-400 font-semibold">
                  {formatFollowers(client.followers)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <p className="text-center text-gray-400 text-sm mt-4">
        Perfis utilizando nossa inteligência artificial
      </p>
    </div>
  );
}
