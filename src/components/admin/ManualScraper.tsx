import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ExternalLink, 
  Save, 
  Instagram, 
  User, 
  Users, 
  FileText, 
  Link as LinkIcon,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  Search
} from 'lucide-react';

interface ScrapedProfileData {
  username: string;
  fullName: string;
  bio: string;
  followers: number;
  following: number;
  postsCount: number;
  profilePicture: string;
  externalUrl: string;
  isVerified: boolean;
}

const ManualScraper = () => {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [targetUsername, setTargetUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState<ScrapedProfileData>({
    username: '',
    fullName: '',
    bio: '',
    followers: 0,
    following: 0,
    postsCount: 0,
    profilePicture: '',
    externalUrl: '',
    isVerified: false
  });

  // Extract username from URL or clean input
  const cleanUsername = (input: string): string => {
    let clean = input.trim();
    
    // Remove @ if present
    if (clean.startsWith('@')) {
      clean = clean.substring(1);
    }
    
    // Extract from Instagram URL
    const urlPatterns = [
      /instagram\.com\/([^\/\?]+)/i,
      /instagr\.am\/([^\/\?]+)/i
    ];
    
    for (const pattern of urlPatterns) {
      const match = clean.match(pattern);
      if (match) {
        clean = match[1];
        break;
      }
    }
    
    return clean.toLowerCase();
  };

  const handleOpenInstagram = () => {
    const cleanedUsername = cleanUsername(username);
    if (!cleanedUsername) {
      toast({
        title: "Username obrigatório",
        description: "Digite o username do Instagram para abrir",
        variant: "destructive"
      });
      return;
    }
    
    setTargetUsername(cleanedUsername);
    setProfileData(prev => ({ ...prev, username: cleanedUsername }));
    
    // Open Instagram profile in popup
    const instagramUrl = `https://www.instagram.com/${cleanedUsername}/`;
    window.open(instagramUrl, '_blank', 'width=500,height=800,scrollbars=yes');
    
    toast({
      title: "Instagram aberto!",
      description: "Copie os dados do perfil e preencha o formulário abaixo"
    });
  };

  const handleSaveToUser = async () => {
    if (!targetUsername) {
      toast({
        title: "Erro",
        description: "Primeiro abra um perfil do Instagram",
        variant: "destructive"
      });
      return;
    }

    if (!profileData.followers && !profileData.fullName) {
      toast({
        title: "Dados incompletos",
        description: "Preencha pelo menos seguidores ou nome completo",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      // Prepare profile data for caching
      const cacheData = {
        username: targetUsername,
        fullName: profileData.fullName || targetUsername,
        bio: profileData.bio || '',
        followers: profileData.followers || 0,
        following: profileData.following || 0,
        postsCount: profileData.postsCount || 0,
        profilePicture: profileData.profilePicture || `https://ui-avatars.com/api/?name=${targetUsername}&background=E1306C&color=fff`,
        externalUrl: profileData.externalUrl || '',
        isVerified: profileData.isVerified || false,
        isPrivate: false,
        engagementRate: 0,
        posts: [],
        manuallyScraped: true,
        scrapedAt: new Date().toISOString()
      };

      // Save to admin sync data storage
      const { data: existingData, error: loadError } = await supabase.functions.invoke('admin-data-storage', {
        body: { action: 'load' }
      });

      let syncData = { profiles: [], users: [], lastSync: null };
      
      if (!loadError && existingData?.exists && existingData?.data) {
        syncData = existingData.data;
      }

      // Check if profile already exists and update it, or add new
      const existingIndex = syncData.profiles.findIndex(
        (p: any) => p.username?.toLowerCase() === targetUsername.toLowerCase()
      );

      if (existingIndex >= 0) {
        // Update existing profile
        syncData.profiles[existingIndex] = {
          ...syncData.profiles[existingIndex],
          ...cacheData,
          growthHistory: syncData.profiles[existingIndex].growthHistory || []
        };
      } else {
        // Add new profile
        syncData.profiles.push({
          ...cacheData,
          syncedAt: new Date().toISOString(),
          ownerUserName: 'manual-admin',
          isConnectedToDashboard: false,
          growthHistory: [{
            date: new Date().toISOString(),
            followers: cacheData.followers
          }]
        });
      }

      syncData.lastSync = new Date().toISOString();

      // Save back to storage
      const { error: saveError } = await supabase.functions.invoke('admin-data-storage', {
        body: { action: 'save', data: syncData }
      });

      if (saveError) throw saveError;

      toast({
        title: "Perfil salvo!",
        description: `@${targetUsername} foi cacheado com sucesso`
      });

      // Reset form
      setUsername('');
      setTargetUsername('');
      setProfileData({
        username: '',
        fullName: '',
        bio: '',
        followers: 0,
        following: 0,
        postsCount: 0,
        profilePicture: '',
        externalUrl: '',
        isVerified: false
      });

    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar os dados do perfil",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatNumber = (value: string): number => {
    // Remove non-numeric characters except dots and commas
    let clean = value.replace(/[^\d.,kmKM]/g, '');
    
    // Handle K/M suffixes
    if (clean.toLowerCase().includes('k')) {
      return Math.round(parseFloat(clean.replace(/[kK]/g, '')) * 1000);
    }
    if (clean.toLowerCase().includes('m')) {
      return Math.round(parseFloat(clean.replace(/[mM]/g, '')) * 1000000);
    }
    
    // Handle comma as thousand separator
    clean = clean.replace(/\./g, '').replace(/,/g, '');
    
    return parseInt(clean) || 0;
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <Instagram className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Scraper Manual de Perfis</h2>
            <p className="text-sm text-muted-foreground">
              Para perfis com restrição de idade que não podem ser buscados via API
            </p>
          </div>
        </div>

        {/* Step 1: Open Instagram */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-2 text-primary font-medium">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
            Abrir perfil do Instagram
          </div>
          
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="@username ou link do perfil"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-secondary/50"
              />
            </div>
            <Button 
              onClick={handleOpenInstagram}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Instagram
            </Button>
          </div>

          {targetUsername && (
            <div className="flex items-center gap-2 text-sm text-green-500">
              <CheckCircle className="w-4 h-4" />
              Perfil aberto: @{targetUsername}
            </div>
          )}
        </div>

        {/* Step 2: Fill form */}
        {targetUsername && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary font-medium">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
              Preencher dados do perfil (copie do Instagram)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username (readonly) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Username
                </Label>
                <Input
                  value={targetUsername}
                  readOnly
                  className="bg-secondary/30"
                />
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome Completo
                </Label>
                <Input
                  placeholder="Nome exibido no perfil"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="bg-secondary/50"
                />
              </div>

              {/* Followers */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Seguidores
                </Label>
                <Input
                  placeholder="Ex: 10.5K ou 1500"
                  onChange={(e) => setProfileData(prev => ({ ...prev, followers: formatNumber(e.target.value) }))}
                  className="bg-secondary/50"
                />
                {profileData.followers > 0 && (
                  <span className="text-xs text-muted-foreground">
                    = {profileData.followers.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Following */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Seguindo
                </Label>
                <Input
                  placeholder="Ex: 500"
                  onChange={(e) => setProfileData(prev => ({ ...prev, following: formatNumber(e.target.value) }))}
                  className="bg-secondary/50"
                />
              </div>

              {/* Posts Count */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Publicações
                </Label>
                <Input
                  placeholder="Número de posts"
                  onChange={(e) => setProfileData(prev => ({ ...prev, postsCount: formatNumber(e.target.value) }))}
                  className="bg-secondary/50"
                />
              </div>

              {/* Profile Picture */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  URL da Foto de Perfil
                </Label>
                <Input
                  placeholder="Clique com botão direito na foto → Copiar endereço da imagem"
                  value={profileData.profilePicture}
                  onChange={(e) => setProfileData(prev => ({ ...prev, profilePicture: e.target.value }))}
                  className="bg-secondary/50"
                />
              </div>

              {/* External URL */}
              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Link Externo (se houver)
                </Label>
                <Input
                  placeholder="Link na bio do perfil"
                  value={profileData.externalUrl}
                  onChange={(e) => setProfileData(prev => ({ ...prev, externalUrl: e.target.value }))}
                  className="bg-secondary/50"
                />
              </div>

              {/* Bio */}
              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Bio
                </Label>
                <Textarea
                  placeholder="Copie e cole a bio do perfil"
                  value={profileData.bio}
                  onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                  className="bg-secondary/50 min-h-[100px]"
                />
              </div>

              {/* Is Verified */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Perfil Verificado?
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={profileData.isVerified ? "default" : "outline"}
                    size="sm"
                    onClick={() => setProfileData(prev => ({ ...prev, isVerified: true }))}
                  >
                    Sim
                  </Button>
                  <Button
                    type="button"
                    variant={!profileData.isVerified ? "default" : "outline"}
                    size="sm"
                    onClick={() => setProfileData(prev => ({ ...prev, isVerified: false }))}
                  >
                    Não
                  </Button>
                </div>
              </div>
            </div>

            {/* Preview */}
            {(profileData.fullName || profileData.followers > 0) && (
              <div className="mt-6 p-4 bg-secondary/30 rounded-lg">
                <h3 className="text-sm font-medium mb-3">Preview dos dados:</h3>
                <div className="flex items-center gap-4">
                  {profileData.profilePicture ? (
                    <img 
                      src={profileData.profilePicture} 
                      alt={targetUsername}
                      className="w-16 h-16 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${targetUsername}&background=E1306C&color=fff`;
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                      {targetUsername.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-bold">{profileData.fullName || targetUsername}</p>
                    <p className="text-sm text-muted-foreground">@{targetUsername}</p>
                    <div className="flex gap-4 mt-1 text-sm">
                      <span><strong>{profileData.followers.toLocaleString()}</strong> seguidores</span>
                      <span><strong>{profileData.following.toLocaleString()}</strong> seguindo</span>
                      <span><strong>{profileData.postsCount.toLocaleString()}</strong> posts</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Save */}
            <div className="flex items-center gap-2 text-primary font-medium mt-6">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">3</span>
              Salvar dados do perfil
            </div>

            <Button 
              onClick={handleSaveToUser}
              disabled={isSaving}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Perfil no Sistema
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="glass-card p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Search className="w-5 h-5" />
          Como usar o Scraper Manual
        </h3>
        <ol className="space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs flex-shrink-0">1</span>
            <span>Digite o username ou link do perfil do Instagram com restrição de idade</span>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs flex-shrink-0">2</span>
            <span>Clique em "Abrir Instagram" - uma nova janela abrirá com o perfil</span>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs flex-shrink-0">3</span>
            <span>No Instagram, copie os dados: nome, seguidores, seguindo, posts, bio</span>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs flex-shrink-0">4</span>
            <span>Para a foto de perfil: clique com botão direito na foto → "Copiar endereço da imagem"</span>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs flex-shrink-0">5</span>
            <span>Preencha o formulário com os dados copiados</span>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs flex-shrink-0">6</span>
            <span>Clique em "Salvar Perfil" para cachear os dados no sistema</span>
          </li>
        </ol>
        
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            <strong>Dica:</strong> Use seu navegador logado no Instagram para acessar perfis com restrição de idade. 
            Os dados salvos aqui serão usados quando o usuário tentar buscar esse perfil.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ManualScraper;
