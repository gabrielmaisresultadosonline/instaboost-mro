import { Logo } from '@/components/Logo';
import { Shield, CheckCircle, Clock, MessageCircle, AlertTriangle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PoliticaCancelamento = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <Logo size="lg" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Title Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Política de Cancelamento e Reembolso
          </h1>
          <p className="text-lg text-gray-600">
            MRO - Mais Resultados Online
          </p>
        </div>

        {/* Policy Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 space-y-8">
          
          {/* Intro */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Nosso Compromisso
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Nós da <strong>MRO (Mais Resultados Online)</strong> nos responsabilizamos pelos resultados. 
              Por isso, entregamos suporte completo e <strong>garantia de 30 dias</strong> em cima dos resultados. 
              Se nossas ferramentas e nossos sistemas não entregarem os resultados prometidos, 
              cancelamos e <strong>devolvemos 100% do seu dinheiro</strong>.
            </p>
          </section>

          {/* Guarantee */}
          <section className="bg-green-50 rounded-xl p-6 border border-green-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Clock className="w-6 h-6 text-green-600" />
              Garantia de 30 Dias
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Nossa garantia é <strong>explícita e baseada em RESULTADOS</strong>. Se dentro de 30 dias 
              as nossas ferramentas e sistemas não entregarem o que foi prometido, você tem direito 
              ao reembolso integral do valor pago.
            </p>
            <div className="bg-white rounded-lg p-4 border border-green-300">
              <p className="text-green-800 font-semibold text-center">
                ✅ Não entregou resultados? Devolvemos seu dinheiro na hora!
              </p>
            </div>
          </section>

          {/* Support */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-primary" />
              Suporte Completo
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              É por isso que temos <strong>suporte via WhatsApp</strong> e <strong>suporte remoto</strong> para 
              entregar os resultados funcionais. Caso seu problema seja relacionado à <strong>instalação</strong> ou 
              <strong> modo de utilização</strong>, temos suporte completo para isso:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Vídeos passo a passo para instalação</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Suporte humano via WhatsApp</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Suporte remoto para resolução de problemas</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Atualizações constantes das ferramentas</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Atendimento prioritário para dúvidas</span>
              </li>
            </ul>
          </section>

          {/* Social Proof */}
          <section className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-600" />
              +1.500 Clientes Satisfeitos
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Mais de <strong>1.500 clientes</strong> estão tendo resultados funcionais com nossas ferramentas e sistemas. 
              <strong> Nenhum com problema, todos 100% satisfeitos.</strong>
            </p>
            <div className="bg-white rounded-lg p-4 border border-blue-300">
              <p className="text-blue-800 font-semibold text-center">
                🏆 Nossa prioridade é entregar resultados reais para você!
              </p>
            </div>
          </section>

          {/* Important Notice */}
          <section className="bg-amber-50 rounded-xl p-6 border border-amber-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
              Importante: Garantia Baseada em Resultados
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Nossa garantia é em cima dos <strong>RESULTADOS</strong> e não em cima do "querer". 
              Se estivermos entregando resultados, atualizações e suporte como prometido, 
              <strong> não existe reembolso ou devolução</strong> de nenhum valor pago.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Somos uma empresa séria e não brincamos em serviço. Cada minuto e tempo dado ao suporte 
              gera um custo interno, e por isso nossa garantia é explícita a <strong>RESULTADOS</strong>.
            </p>
          </section>

          {/* No Refund Cases */}
          <section className="bg-red-50 rounded-xl p-6 border border-red-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ❌ Casos em que NÃO há reembolso:
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-red-600 font-bold">•</span>
                <span className="text-gray-700">Cancelamento por vontade própria sem motivo justificável</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-600 font-bold">•</span>
                <span className="text-gray-700">Quando os resultados prometidos estão sendo entregues</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-600 font-bold">•</span>
                <span className="text-gray-700">Quando o suporte e atualizações estão sendo fornecidos conforme prometido</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-600 font-bold">•</span>
                <span className="text-gray-700">Desistência após o período de garantia de 30 dias</span>
              </li>
            </ul>
          </section>

          {/* Refund Cases */}
          <section className="bg-green-50 rounded-xl p-6 border border-green-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ✅ Casos em que há reembolso integral:
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Ferramentas não funcionam conforme prometido</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Resultados prometidos não são entregues dentro de 30 dias</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Falta de suporte ou atendimento conforme prometido</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Problemas técnicos que impedem o uso das ferramentas</span>
              </li>
            </ul>
          </section>

          {/* Summary */}
          <section className="text-center pt-6 border-t">
            <p className="text-lg text-gray-700 mb-6">
              <strong>Resumindo:</strong> Se você seguir as orientações e as ferramentas não entregarem 
              o que prometemos, devolvemos seu dinheiro. Se funcionar e você simplesmente desistir, 
              não há reembolso.
            </p>
            <p className="text-gray-500 text-sm">
              Última atualização: Dezembro de 2024
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 space-y-6">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Voltar para o início
          </Button>
          
          <div className="text-gray-500 text-sm space-y-1">
            <p className="font-semibold">MRO - Mais Resultados Online</p>
            <p>Gabriel Fernandes da Silva</p>
            <p>CNPJ: 54.840.738/0001-96</p>
            <p>© 2024. Todos os direitos reservados.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PoliticaCancelamento;
