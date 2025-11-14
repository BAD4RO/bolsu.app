'use client';

import { useState } from 'react';
import { ArrowLeft, Bell, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

type TipoNotificacao = 'dica' | 'aviso' | 'alerta';

interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  cor: string;
  icone: string;
}

export default function NotificacoesPage() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoNotificacao>('dica');
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');

  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([
    {
      id: '1',
      tipo: 'dica',
      titulo: 'Economize mais!',
      mensagem: 'Defina metas mensais para suas categorias de gastos e acompanhe seu progresso.',
      cor: '#10b981',
      icone: '💡',
    },
    {
      id: '2',
      tipo: 'aviso',
      titulo: 'Vencimento próximo',
      mensagem: 'Você tem 3 contas vencendo nos próximos 5 dias. Não esqueça de pagá-las!',
      cor: '#ffa506',
      icone: '⚠️',
    },
    {
      id: '3',
      tipo: 'alerta',
      titulo: 'Limite ultrapassado',
      mensagem: 'Você ultrapassou o limite de gastos em Alimentação este mês.',
      cor: '#ef4444',
      icone: '🚨',
    },
  ]);

  const tiposNotificacao = [
    { value: 'dica' as TipoNotificacao, label: 'Dica', cor: '#10b981', icone: '💡' },
    { value: 'aviso' as TipoNotificacao, label: 'Aviso', cor: '#ffa506', icone: '⚠️' },
    { value: 'alerta' as TipoNotificacao, label: 'Alerta', cor: '#ef4444', icone: '🚨' },
  ];

  const handleSalvar = () => {
    const tipoSelecionado = tiposNotificacao.find((t) => t.value === tipo);
    if (!tipoSelecionado) return;

    if (editandoId) {
      setNotificacoes(
        notificacoes.map((n) =>
          n.id === editandoId
            ? { ...n, tipo, titulo, mensagem, cor: tipoSelecionado.cor, icone: tipoSelecionado.icone }
            : n
        )
      );
    } else {
      const novaNotificacao: Notificacao = {
        id: Date.now().toString(),
        tipo,
        titulo,
        mensagem,
        cor: tipoSelecionado.cor,
        icone: tipoSelecionado.icone,
      };
      setNotificacoes([...notificacoes, novaNotificacao]);
    }

    setDialogOpen(false);
    setEditandoId(null);
    setTitulo('');
    setMensagem('');
    setTipo('dica');
  };

  const handleEditar = (notificacao: Notificacao) => {
    setEditandoId(notificacao.id);
    setTipo(notificacao.tipo);
    setTitulo(notificacao.titulo);
    setMensagem(notificacao.mensagem);
    setDialogOpen(true);
  };

  const handleExcluir = (id: string) => {
    setNotificacoes(notificacoes.filter((n) => n.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0f0f16] pb-8">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#252531] to-[#16161f] p-6 rounded-b-3xl shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="text-white hover:bg-[#262633] rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Notificações</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                className="bg-[#ffa506] hover:bg-[#ff8800] rounded-full"
                onClick={() => {
                  setEditandoId(null);
                  setTitulo('');
                  setMensagem('');
                  setTipo('dica');
                }}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#16161f] border-[#262633] text-white">
              <DialogHeader>
                <DialogTitle>{editandoId ? 'Editar' : 'Nova'} Notificação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <div className="flex space-x-2">
                    {tiposNotificacao.map((t) => (
                      <Button
                        key={t.value}
                        onClick={() => setTipo(t.value)}
                        className={`flex-1 h-12 rounded-xl ${
                          tipo === t.value
                            ? 'border-2'
                            : 'bg-[#262633] hover:bg-[#262633]/80'
                        }`}
                        style={{
                          backgroundColor: tipo === t.value ? t.cor : undefined,
                          borderColor: tipo === t.value ? t.cor : undefined,
                        }}
                      >
                        <span className="mr-2">{t.icone}</span>
                        {t.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Economize mais!"
                    className="bg-[#262633] border-[#262633] h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    placeholder="Digite a mensagem da notificação..."
                    className="bg-[#262633] border-[#262633] rounded-xl min-h-[100px]"
                  />
                </div>
                <Button
                  onClick={handleSalvar}
                  className="w-full bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506] h-12 rounded-xl"
                >
                  {editandoId ? 'Salvar Alterações' : 'Criar Notificação'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {notificacoes.length === 0 ? (
          <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-12 border border-[#262633] text-center">
            <Bell className="w-16 h-16 text-[#9ca3af] mx-auto mb-4" />
            <p className="text-[#9ca3af]">Nenhuma notificação criada ainda</p>
          </div>
        ) : (
          notificacoes.map((notificacao) => (
            <div
              key={notificacao.id}
              className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-4 border border-[#262633]"
            >
              <div className="flex items-start space-x-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: `${notificacao.cor}20` }}
                >
                  {notificacao.icone}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1">{notificacao.titulo}</h3>
                  <p className="text-sm text-[#9ca3af]">{notificacao.mensagem}</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEditar(notificacao)}
                    className="text-[#9ca3af] hover:text-white hover:bg-[#262633] h-8 w-8"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleExcluir(notificacao.id)}
                    className="text-[#ef4444] hover:text-white hover:bg-[#ef4444]/20 h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
