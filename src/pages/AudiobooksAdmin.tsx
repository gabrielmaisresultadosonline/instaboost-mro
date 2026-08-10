import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ShoppingCart, UserCheck, Zap } from "lucide-react";

export default function AudiobooksAdmin() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audiobooks_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black uppercase italic text-foreground">
          Vendas de Audiobooks
        </h1>
        <Button onClick={loadOrders} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-zinc-950 text-white border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase text-zinc-500">Total de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black">{orders.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950 text-white border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase text-zinc-500">Bumps Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black">
              {orders.filter(o => o.has_bump_lifetime || o.has_bump_profile_analysis).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">Nenhum pedido encontrado.</p>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="bg-zinc-950 border-zinc-800 overflow-hidden group hover:border-green-500/50 transition-colors">
              <CardContent className="p-0">
                <div className="p-6 flex flex-wrap items-start justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-xl text-white italic">{order.name || 'Cliente Sem Nome'}</p>
                      {order.status === 'paid' ? (
                        <Badge className="bg-green-500 text-white font-bold">PAGO</Badge>
                      ) : (
                        <Badge variant="outline" className="text-zinc-500 border-zinc-700">PENDENTE</Badge>
                      )}
                    </div>
                    <p className="text-zinc-400 text-sm font-medium">{order.email} · {order.whatsapp || 'Sem Whats'}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Badge variant="secondary" className="bg-zinc-900 border-zinc-800 text-zinc-300 gap-1">
                        <ShoppingCart className="w-3 h-3" /> NSU: {order.order_nsu}
                      </Badge>
                      {order.has_bump_lifetime && (
                        <Badge className="bg-yellow-400 text-black font-black gap-1 uppercase text-[10px]">
                          <Zap className="w-3 h-3" /> Bump: Vitalício
                        </Badge>
                      )}
                      {order.has_bump_profile_analysis && (
                        <Badge className="bg-blue-500 text-white font-black gap-1 uppercase text-[10px]">
                          <UserCheck className="w-3 h-3" /> Bump: Análise
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-zinc-500 uppercase">Valor do Pedido</p>
                    <p className="text-3xl font-black text-green-500 italic">R$ {Number(order.amount).toFixed(2)}</p>
                    <p className="text-[10px] text-zinc-600 mt-1">{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}