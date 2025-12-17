import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

const getProxiedImageUrl = (url: string): string => {
  if (!url) return '';
  // If already proxied, return as is
  if (url.includes('images.weserv.nl')) return url;
  // Proxy through weserv.nl for CORS handling
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=128&h=128&fit=cover&default=https://ui-avatars.com/api/?name=U&background=EAB308&color=000&size=128`;
};

export default function ActiveClientsSection({ 
  title = "Clientes Ativos", 
  maxClients = 15,
  className = ""
}: ActiveClientsSectionProps) {
  const [clients, setClients] = useState<ActiveClient[]>([]);
  const [allClients, setAllClients] = useState<ActiveClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-active-clients');
        
        if (!error && data?.success && data?.clients) {
          setAllClients(data.clients);
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

  const handleImageError = (username: string) => {
    setImageErrors(prev => new Set(prev).add(username));
  };

  const renderAvatar = (client: ActiveClient, size: 'sm' | 'md' = 'sm') => {
    const hasError = imageErrors.has(client.username);
    const sizeClasses = size === 'sm' ? 'w-14 h-14 md:w-16 md:h-16' : 'w-16 h-16';
    const textSize = size === 'sm' ? 'text-lg' : 'text-xl';

    if (hasError || !client.profilePicture) {
      return (
        <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-black font-bold ${textSize}`}>
          {client.username.charAt(0).toUpperCase()}
        </div>
      );
    }

    return (
      <img 
        src={getProxiedImageUrl(client.profilePicture)}
        alt={client.username}
        className={`${sizeClasses} rounded-full object-cover`}
        onError={() => handleImageError(client.username)}
      />
    );
  };

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

  if (allClients.length === 0) {
    return null;
  }

  return (
    <>
      <div className={`py-8 ${className}`}>
        <div className="flex items-center justify-center gap-2 mb-6">
          <Users className="w-6 h-6 text-yellow-400" />
          <h3 className="text-xl md:text-2xl font-bold text-white">{title}</h3>
          <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-sm font-medium">
            {allClients.length}
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
                    {renderAvatar(client, 'sm')}
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
        
        {allClients.length > maxClients && (
          <div className="flex justify-center mt-6">
            <Button
              onClick={() => setShowModal(true)}
              variant="outline"
              className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-400"
            >
              Ver todos ({allClients.length})
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
        
        <p className="text-center text-gray-400 text-sm mt-4">
          Perfis utilizando nossa inteligência artificial
        </p>
      </div>

      {/* Modal Ver Todos */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-bold text-white">Todos os Clientes Ativos</h3>
                <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-sm font-medium">
                  {allClients.length}
                </span>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {allClients.map((client) => (
                  <div 
                    key={client.username}
                    className="flex flex-col items-center group"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-yellow-400/50 group-hover:border-yellow-400 transition-all duration-300">
                        {renderAvatar(client, 'md')}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-gray-900" />
                    </div>
                    
                    <div className="mt-2 text-center">
                      <p className="text-xs text-gray-300 truncate max-w-[80px]">
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
          </div>
        </div>
      )}
    </>
  );
}
