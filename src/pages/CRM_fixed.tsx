// ... keep existing code up to line 5798
      </Dialog>

      <Dialog open={isNewStatusDialogOpen} onOpenChange={setIsNewStatusDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Nova Etiqueta Kanban</DialogTitle>
            <DialogDescription>Crie uma nova etapa para o seu funil de vendas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Etiqueta</Label>
              <Input 
                placeholder="Ex: Prospectando, Reunião Agendada..." 
                value={newStatusData.label}
                onChange={e => setNewStatusData({...newStatusData, label: e.target.value})}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor da Etiqueta</Label>
              <Select value={newStatusData.color} onValueChange={val => setNewStatusData({...newStatusData, color: val})}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Azul</SelectItem>
                  <SelectItem value="yellow">Amarelo</SelectItem>
                  <SelectItem value="purple">Roxo</SelectItem>
                  <SelectItem value="green">Verde</SelectItem>
                  <SelectItem value="red">Vermelho</SelectItem>
                  <SelectItem value="orange">Laranja</SelectItem>
                  <SelectItem value="indigo">Índigo</SelectItem>
                  <SelectItem value="pink">Rosa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNewStatusDialogOpen(false)} className="rounded-xl h-11">Cancelar</Button>
            <Button onClick={handleCreateStatus} disabled={saving || !newStatusData.label} className="rounded-xl h-11 px-8 bg-primary">Criar Etiqueta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditStatusDialogOpen} onOpenChange={setIsEditStatusDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Editar Etiqueta</DialogTitle>
            <DialogDescription>Altere as informações da etapa do funil.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Etiqueta</Label>
              <Input 
                placeholder="Nome..." 
                value={editingStatus?.label || ''}
                onChange={e => setEditingStatus({...editingStatus, label: e.target.value})}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor da Etiqueta</Label>
              <Select value={editingStatus?.color} onValueChange={val => setEditingStatus({...editingStatus, color: val})}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Azul</SelectItem>
                  <SelectItem value="yellow">Amarelo</SelectItem>
                  <SelectItem value="purple">Roxo</SelectItem>
                  <SelectItem value="green">Verde</SelectItem>
                  <SelectItem value="red">Vermelho</SelectItem>
                  <SelectItem value="orange">Laranja</SelectItem>
                  <SelectItem value="indigo">Índigo</SelectItem>
                  <SelectItem value="pink">Rosa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <RefreshCcw className={cn("w-4 h-4 text-zinc-500", editingStatus?.is_starred && "text-yellow-500 fill-yellow-500")} /> 
                  Destacar no Chat
                </Label>
                <p className="text-[10px] text-muted-foreground">Exibir como botão fixo no cabeçalho da conversa.</p>
              </div>
              <Switch 
                checked={editingStatus?.is_starred || false}
                onCheckedChange={(val) => setEditingStatus({...editingStatus, is_starred: val})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditStatusDialogOpen(false)} className="rounded-xl h-11">Cancelar</Button>
            <Button onClick={handleUpdateStatus} disabled={saving || !editingStatus?.label} className="rounded-xl h-11 px-8 bg-primary">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default CRM;
