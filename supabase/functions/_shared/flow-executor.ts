import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

export async function executeVisualNode(supabase: any, flow: any, node: any, contactId: string, waId: string) {
  console.log(`Executing node ${node.id} (${node.type}) for contact ${contactId}`);

  try {
    if (node.type === 'message' || node.type === 'text' || node.type === 'question' || node.type === 'wait_response') {
      const text = node.data?.text || node.data?.content || node.data?.question || "";
      const buttons = node.data?.buttons || [];
      
      if (buttons && buttons.length > 0) {
        // Enviar como mensagem interativa com botões (Meta Interactive Buttons)
        await supabase.functions.invoke('meta-whatsapp-crm', {
          body: { 
            action: 'sendMessage', 
            to: waId, 
            contactId,
            interactive: {
              type: 'button',
              body: { text: text || "Escolha uma opção:" },
              action: {
                buttons: buttons.slice(0, 3).map((btn: any, index: number) => ({
                  type: 'reply',
                  reply: {
                    id: btn.id || `btn_${index}`,
                    title: btn.label || btn.text || `Opção ${index + 1}`
                  }
                }))
              }
            }
          }
        });
      } else if (text) {
        await supabase.functions.invoke('meta-whatsapp-crm', {
          body: { action: 'sendMessage', to: waId, text, contactId }
        });
      }

      if (node.type === 'question' || node.type === 'wait_response') {
        console.log(`Node ${node.id} is a wait/question node. Setting state to waiting_response.`);
        await supabase.from('crm_contacts').update({
          flow_state: 'waiting_response',
          next_execution_time: null
        }).eq('id', contactId);
        return { success: true, message: 'Sent interactive buttons and waiting for response' };
      }
    } else if (node.type === 'image' || node.type === 'video' || node.type === 'audio' || node.type === 'document') {
      const mediaUrl = node.data?.url || node.data?.mediaUrl;
      if (mediaUrl) {
        await supabase.functions.invoke('meta-whatsapp-crm', {
          body: { 
            action: 'sendMessage', 
            to: waId, 
            [node.type + 'Url']: mediaUrl,
            contactId,
            isVoice: node.type === 'audio' && node.data?.isVoice
          }
        });
      }
    } else if (node.type === 'template') {
      const templateName = node.data?.templateName;
      if (templateName) {
        await supabase.functions.invoke('meta-whatsapp-crm', {
          body: { action: 'sendTemplate', to: waId, templateName, languageCode: node.data?.language || 'pt_BR', contactId }
        });
      }
    } else if (node.type === 'delay') {
      const waitTime = parseInt(node.data?.delay || '5');
      const nextExecution = new Date(Date.now() + waitTime * 1000).toISOString();
      
      const edge = flow.edges?.find((e: any) => e.source === node.id);
      if (edge) {
        await supabase.from('crm_contacts').update({
          next_execution_time: nextExecution,
          current_node_id: edge.target,
          flow_state: 'running'
        }).eq('id', contactId);
        
        console.log(`Delay node ${node.id}: Scheduled next node ${edge.target} at ${nextExecution}`);
        return { success: true, message: `Delay scheduled for ${waitTime}s` };
      }
    }

    // Find next node based on handle or standard connection
    const edge = flow.edges?.find((e: any) => e.source === node.id);
    
    if (edge) {
      const nextNode = flow.nodes?.find((n: any) => n.id === edge.target);
      if (nextNode) {
        const delay = parseInt(node.data?.delayAfter || '2');
        console.log(`Scheduling next node ${nextNode.id} with ${delay}s delay`);
        const nextTime = new Date(Date.now() + delay * 1000).toISOString();
        await supabase.from('crm_contacts').update({
          current_node_id: nextNode.id,
          next_execution_time: nextTime,
          flow_state: 'running'
        }).eq('id', contactId);
        
        return { success: true, message: 'Next node scheduled', nextNodeId: nextNode.id };
      }
    }

    console.log(`End of flow reached for contact ${contactId}`);
    await supabase.from('crm_contacts').update({
      flow_state: 'idle',
      current_flow_id: null,
      current_node_id: null,
      next_execution_time: null
    }).eq('id', contactId);

    return { success: true };
  } catch (err: any) {
    console.error(`Error executing node ${node.id}:`, err);
    await supabase.from('crm_contacts').update({
      flow_state: 'error',
      metadata: { last_flow_error: err.message }
    }).eq('id', contactId);
    throw err;
  }
}

export async function processStep(supabase: any, step: any, contactId: string, waId: string) {
  console.log(`Executing legacy step ${step.id} for contact ${contactId}`);
  return { success: true };
}
