// Stripe integration module
// Key is loaded from .env file (VITE_STRIPE_PUBLISHABLE_KEY)
const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

let stripe = null;
let elements = null;
let usingFallback = false;

export function initStripe() {
  const container = document.getElementById('stripe-payment-element');
  if (!container) return null;

  // Real Stripe keys are 100+ chars. Placeholder keys are short.
  const isValidKey = window.Stripe && STRIPE_PK && STRIPE_PK.startsWith('pk_') && STRIPE_PK.length > 30;

  if (!isValidKey) {
    console.warn('Stripe key missing/placeholder — using fallback card form');
    stripe = null; elements = null;
    renderFallbackForm(container);
    usingFallback = true;
    return { fallback: true };
  }

  try {
    stripe = Stripe(STRIPE_PK);
    elements = stripe.elements({
      mode: 'payment',
      amount: 1999,
      currency: 'usd',
      paymentMethodCreation: 'manual',
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#d08c40', colorBackground: '#1a1d23',
          colorText: '#e8ebf0', colorTextSecondary: '#6b7280',
          colorTextPlaceholder: '#4b5260', colorDanger: '#e5534b',
          fontFamily: 'Inter, system-ui, sans-serif',
          borderRadius: '8px', spacingUnit: '4px', fontSizeBase: '14px',
        },
        rules: {
          '.Input': { border: '1px solid #303540', boxShadow: 'none', padding: '10px 12px' },
          '.Input:focus': { border: '1px solid #d08c40', boxShadow: '0 0 0 1px rgba(208,140,64,.3)' },
          '.Label': { fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#6b7280' },
          '.Tab': { border: '1px solid #303540', backgroundColor: '#22262e' },
          '.Tab--selected': { border: '1px solid #d08c40', backgroundColor: 'rgba(208,140,64,.12)' },
        },
      },
    });
    const paymentElement = elements.create('payment', {
      layout: { type: 'tabs', defaultCollapsed: false },
    });
    paymentElement.mount(container);
    return { stripe, elements, paymentElement };
  } catch (e) {
    console.warn('Stripe init error, falling back:', e.message);
    stripe = null; elements = null;
    renderFallbackForm(container);
    usingFallback = true;
    return { fallback: true };
  }
}

function renderFallbackForm(container) {
  container.innerHTML = `
    <div class="fallback-card-form">
      <div class="card-field">
        <label>Номер карты</label>
        <div class="card-input-wrapper">
          <svg class="card-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          <input type="text" id="fb-card-number" placeholder="4242 4242 4242 4242" maxlength="19" autocomplete="cc-number" inputmode="numeric">
        </div>
      </div>
      <div class="card-row">
        <div class="card-field">
          <label>Срок действия</label>
          <input type="text" id="fb-card-expiry" placeholder="MM / YY" maxlength="7" autocomplete="cc-exp" inputmode="numeric">
        </div>
        <div class="card-field">
          <label>CVC</label>
          <div class="card-input-wrapper">
            <input type="text" id="fb-card-cvc" placeholder="123" maxlength="4" autocomplete="cc-csc" inputmode="numeric">
            <svg class="card-cvc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/><rect x="14" y="13" width="5" height="3" rx="1"/></svg>
          </div>
        </div>
      </div>
    </div>`;

  // Auto-format card number
  const cardNum = container.querySelector('#fb-card-number');
  cardNum.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '').substring(0, 16);
    e.target.value = v.replace(/(\d{4})(?=\d)/g, '$1 ');
  });

  // Auto-format expiry
  const expiry = container.querySelector('#fb-card-expiry');
  expiry.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (v.length >= 2) v = v.substring(0, 2) + ' / ' + v.substring(2);
    e.target.value = v;
  });

  // CVC limit
  const cvc = container.querySelector('#fb-card-cvc');
  cvc.addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
  });
}

export async function handlePayment(selectedPlan) {
  const planPrices = {
    month: { amount: 299, label: '$2.99/мес' },
    year: { amount: 1999, label: '$19.99/год' },
    lifetime: { amount: 4999, label: '$49.99 навсегда' },
  };
  const plan = planPrices[selectedPlan] || planPrices.year;

  // Fallback mode — validate the form visually
  if (usingFallback || !stripe || !elements) {
    const num = document.getElementById('fb-card-number')?.value.replace(/\s/g, '') || '';
    const exp = document.getElementById('fb-card-expiry')?.value || '';
    const cvc = document.getElementById('fb-card-cvc')?.value || '';

    if (num.length < 13) return { success: false, error: 'Введите номер карты' };
    if (exp.length < 5) return { success: false, error: 'Введите срок действия' };
    if (cvc.length < 3) return { success: false, error: 'Введите CVC' };

    // Simulate processing delay
    await new Promise(r => setTimeout(r, 1500));

    console.log(`[Demo] Payment for ${plan.label}, card ending ${num.slice(-4)}`);
    return { success: true, demo: true, plan: selectedPlan };
  }

  // Real Stripe mode
  try {
    // Must call submit() before createPaymentMethod() (deferred flow)
    const { error: submitError } = await elements.submit();
    if (submitError) return { success: false, error: submitError.message };

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      elements,
      params: { type: 'card' },
    });
    if (error) return { success: false, error: error.message };

    console.log('Payment Method created:', paymentMethod.id, 'Plan:', plan.label);
    return { success: true, paymentMethodId: paymentMethod.id, plan: selectedPlan, demo: false };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Test cards:
// Card: 4242 4242 4242 4242
// Expiry: any future date (12/34)
// CVC: any 3 digits (123)
