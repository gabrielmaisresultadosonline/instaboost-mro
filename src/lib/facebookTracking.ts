import { supabase } from "@/integrations/supabase/client";

// Facebook Pixel ID
const PIXEL_ID = '569414052132145';

// Get Facebook cookies
const getFacebookCookies = () => {
  const cookies = document.cookie.split(';');
  let fbc = '';
  let fbp = '';
  
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === '_fbc') fbc = value;
    if (name === '_fbp') fbp = value;
  }
  
  return { fbc, fbp };
};

// Get test event code from URL
const getTestEventCode = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('test_event_code');
};

// Declare fbq for TypeScript
declare global {
  interface Window {
    fbq: any;
  }
}

/**
 * Track Facebook event - fires both client-side Pixel AND server-side Conversions API
 * @param eventName - Event name (PageView, Lead, InitiateCheckout, Purchase, ViewContent, etc.)
 * @param customData - Optional custom data for the event
 */
export const trackFacebookEvent = async (
  eventName: string,
  customData?: {
    content_name?: string;
    content_category?: string;
    value?: number;
    currency?: string;
    email?: string;
    phone?: string;
  }
) => {
  try {
    // 1. Fire client-side Pixel event (immediate)
    if (typeof window !== 'undefined' && window.fbq) {
      if (customData && Object.keys(customData).length > 0) {
        window.fbq('track', eventName, {
          content_name: customData.content_name,
          content_category: customData.content_category,
          value: customData.value,
          currency: customData.currency || 'BRL'
        });
      } else {
        window.fbq('track', eventName);
      }
      console.log(`[FB-PIXEL] Client event fired: ${eventName}`);
    }

    // 2. Fire server-side Conversions API (for better tracking)
    const { fbc, fbp } = getFacebookCookies();
    const testEventCode = getTestEventCode();

    const payload: Record<string, any> = {
      event_name: eventName,
      event_source_url: window.location.href,
      user_agent: navigator.userAgent,
      fbc: fbc || undefined,
      fbp: fbp || undefined,
      test_event_code: testEventCode || undefined,
      ...customData
    };

    // Remove undefined values
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) delete payload[key];
    });

    const { data, error } = await supabase.functions.invoke('meta-conversions', {
      body: payload
    });

    if (error) {
      console.error(`[FB-API] Error sending ${eventName}:`, error);
    } else {
      console.log(`[FB-API] Server event sent: ${eventName}`, data);
    }
  } catch (err) {
    console.error(`[FB-TRACKING] Error tracking ${eventName}:`, err);
  }
};

/**
 * Track PageView - call on page load
 */
export const trackPageView = (pageName?: string) => {
  trackFacebookEvent('PageView', pageName ? { content_name: pageName } : undefined);
};

/**
 * Track Lead - when user shows purchase intent (e.g., clicks WhatsApp)
 */
export const trackLead = (leadSource?: string) => {
  trackFacebookEvent('Lead', {
    content_name: leadSource || 'WhatsApp Contact',
    content_category: 'Lead'
  });
};

/**
 * Track InitiateCheckout - when user clicks buy button
 */
export const trackInitiateCheckout = (productName?: string, value?: number) => {
  trackFacebookEvent('InitiateCheckout', {
    content_name: productName || 'MRO Product',
    value: value,
    currency: 'BRL'
  });
};

/**
 * Track ViewContent - when user views important content
 */
export const trackViewContent = (contentName: string, category?: string) => {
  trackFacebookEvent('ViewContent', {
    content_name: contentName,
    content_category: category
  });
};

/**
 * Track Purchase - when purchase is completed
 */
export const trackPurchase = (value: number, productName?: string) => {
  trackFacebookEvent('Purchase', {
    content_name: productName || 'MRO Product',
    value: value,
    currency: 'BRL'
  });
};

/**
 * Track button click with custom event
 */
export const trackButtonClick = (buttonName: string, category?: string) => {
  trackFacebookEvent('ViewContent', {
    content_name: `Button: ${buttonName}`,
    content_category: category || 'Button Click'
  });
};
