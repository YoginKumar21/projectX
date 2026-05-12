import { useState } from "react";
import AppShell from "../components/layout/AppShell.jsx";
import toast from "react-hot-toast";

function Pricing() {
  const [searchTerm, setSearchTerm] = useState("");
  const [billingPeriod, setBillingPeriod] = useState("monthly"); // 'monthly' | 'yearly'
  const [selectedPlan, setSelectedPlan] = useState(null); // plan object to checkout
  const [checkoutMethod, setCheckoutMethod] = useState("qr"); // 'qr' | 'razorpay'
  const [paymentStep, setPaymentStep] = useState("input"); // 'input' | 'processing' | 'success'
  
  // Mock form inputs for checkout
  const [utrNumber, setUtrNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const plans = [
    {
      name: "Free",
      id: "free",
      desc: "Perfect for individuals starting out with smart collaborative writing.",
      price: { monthly: 0, yearly: 0 },
      features: [
        "Up to 5 collaborative notes",
        "Basic markdown text editor",
        "Standard document reference parser (PDF/TXT)",
        "5 AI model chat compilation assists per month",
        "Single-device access",
      ],
      buttonText: "Current Plan",
      popular: false,
    },
    {
      name: "Plus",
      id: "plus",
      desc: "For growing creators, writers, and professional workspace teams.",
      price: { monthly: 649, yearly: 519 },
      features: [
        "Unlimited collaborative notes",
        "Advanced premium editor layouts",
        "Up to 3 active Collaborative Code rooms",
        "50 AI Universal Summaries (Audio/Docs/YouTube) / mo",
        "Multi-device cloud syncing",
        "Priority email assistance",
      ],
      buttonText: "Upgrade to Plus",
      popular: true,
    },
    {
      name: "Pro",
      id: "pro",
      desc: "Ultimate collaborative suite with unlimited universal AI assets.",
      price: { monthly: 1249, yearly: 999 },
      features: [
        "Everything in Plus, and more",
        "Unlimited Collaborative Code rooms",
        "Unlimited AI Universal Summaries",
        "Unlimited Audio transcription (HF Whisper v3)",
        "Zero-latency real-time collaboration",
        "24/7 Premium dedicated assistance",
      ],
      buttonText: "Upgrade to Pro",
      popular: false,
    },
  ];

  const handleOpenCheckout = (plan) => {
    if (plan.id === "free") {
      toast.success("You are already on the Free tier!");
      return;
    }
    setSelectedPlan(plan);
    setPaymentStep("input");
    setUtrNumber("");
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
  };

  const handleCloseCheckout = () => {
    setSelectedPlan(null);
  };

  const handleCompletePayment = (e) => {
    e.preventDefault();
    if (checkoutMethod === "qr" && !utrNumber.trim()) {
      toast.error("Please enter the UTR or Transaction ID to confirm");
      return;
    }
    if (checkoutMethod === "razorpay") {
      if (!cardName.trim() || !cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
        toast.error("Please fill in all the card details");
        return;
      }
    }

    setPaymentStep("processing");
    
    // Simulate payment transaction validation
    setTimeout(() => {
      setPaymentStep("success");
      toast.success(`Welcome to the ${selectedPlan.name} workspace tier!`);
    }, 2500);
  };

  return (
    <AppShell searchTerm={searchTerm} setSearchTerm={setSearchTerm}>
      <div className="flex-1 p-gutter flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
        
        {/* Page Title Header */}
        <div className="w-full max-w-4xl text-center mb-10">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-primary px-3 py-1.5 bg-primary/10 rounded-full">
            Flexible Plans
          </span>
          <h1 className="font-h2 text-4xl text-on-surface mt-4 mb-3 tracking-tight font-extrabold">
            Unlock the Full Power of SyncPad
          </h1>
          <p className="text-sm text-on-surface-variant max-w-xl mx-auto">
            Choose the perfect tier to match your collaborative workflows. Upgrade anytime to harness real-time IDE compiler rooms and Whisper AI Summaries.
          </p>

          {/* Pricing Period Toggle Switcher */}
          <div className="flex items-center justify-center gap-3.5 mt-8">
            <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${billingPeriod === "monthly" ? "text-primary" : "text-on-surface-variant"}`}>
              Billed Monthly
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly")}
              className="w-14 h-7 bg-surface-container-highest rounded-full p-1 relative flex items-center transition-colors focus:outline-none border border-outline-variant/10 cursor-pointer"
            >
              <div
                className={`w-5 h-5 bg-primary rounded-full shadow-md transition-transform duration-300 ${
                  billingPeriod === "yearly" ? "translate-x-7" : "translate-x-0"
                }`}
              />
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${billingPeriod === "yearly" ? "text-primary" : "text-on-surface-variant"}`}>
                Billed Yearly
              </span>
              <span className="text-[10px] font-black uppercase bg-success/20 text-success px-2 py-0.5 rounded-full tracking-wider animate-pulse">
                Save 20%
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Matrix Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mb-12">
          {plans.map((plan) => {
            const calculatedPrice = plan.price[billingPeriod];
            
            return (
              <div
                key={plan.id}
                className={`glass-card-premium rounded-3xl p-6 flex flex-col justify-between border transition-all duration-500 relative hover:shadow-2xl hover:-translate-y-1.5 group cursor-default ${
                  plan.popular
                    ? "border-primary shadow-xl shadow-primary/5 bg-primary/5"
                    : "border-outline-variant/10 shadow-sm bg-surface-container-low/50"
                }`}
              >
                {/* Popularity Badge */}
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest rounded-full shadow-md shadow-primary/20">
                    Most Popular
                  </span>
                )}

                <div>
                  <h3 className="text-xl font-extrabold text-on-surface group-hover:text-primary transition-colors mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-on-surface-variant min-h-[40px] leading-relaxed mb-6">
                    {plan.desc}
                  </p>

                  <div className="flex items-baseline gap-1.5 mb-6">
                    <span className="text-xl font-bold text-on-surface-variant">₹</span>
                    <span className="text-3xl font-extrabold text-on-surface">
                      {calculatedPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">
                      / month
                    </span>
                  </div>

                  <div className="border-t border-outline-variant/10 pt-6 mb-8">
                    <h4 className="text-[10px] font-black text-on-surface uppercase tracking-widest mb-4">
                      Core Features Included
                    </h4>
                    <ul className="space-y-3.5">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-on-surface-variant leading-normal">
                          <span className="material-symbols-outlined text-primary text-[16px] mt-0.5 select-none">
                            check_circle
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenCheckout(plan)}
                  className={`w-full py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
                    plan.id === "free"
                      ? "bg-surface-container-highest text-outline-variant border border-outline-variant/20 cursor-default shadow-none"
                      : plan.popular
                      ? "bg-primary text-on-primary hover:bg-primary/95 shadow-primary/25"
                      : "bg-surface-container text-on-surface hover:bg-surface-container-highest"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {plan.id === "free" ? "lock_open" : "bolt"}
                  </span>
                  {plan.buttonText}
                </button>
              </div>
            );
          })}
        </div>

        {/* Checkout Modal Overlay */}
        {selectedPlan && (
          <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-[#0f172a] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative animate-in zoom-in-95 duration-300">
              
              {/* Close Button */}
              <button
                onClick={handleCloseCheckout}
                className="absolute top-5 right-5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>

              {paymentStep === "input" && (
                <div>
                  {/* Plan Details Preview */}
                  <div className="mb-6">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Secure Checkout
                    </span>
                    <h2 className="text-2xl font-extrabold text-white mt-1">
                      Upgrade to {selectedPlan.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 leading-normal">
                      Tier Rate: <strong className="text-white">₹{selectedPlan.price[billingPeriod].toLocaleString("en-IN")} / month</strong> (billed {billingPeriod})
                    </p>
                  </div>

                  {/* Payment Method Tabs */}
                  <div className="flex border-b border-slate-800 mb-6">
                    <button
                      onClick={() => setCheckoutMethod("qr")}
                      className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                        checkoutMethod === "qr"
                          ? "border-primary text-primary"
                          : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                      Scan UPI QR
                    </button>
                    <button
                      onClick={() => setCheckoutMethod("razorpay")}
                      className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                        checkoutMethod === "razorpay"
                          ? "border-primary text-primary"
                          : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">credit_card</span>
                      Razorpay Checkout
                    </button>
                  </div>

                  {/* Payment Card Forms */}
                  <form onSubmit={handleCompletePayment} className="space-y-5">
                    
                    {checkoutMethod === "qr" && (
                      <div className="text-center space-y-4">
                        <div className="bg-slate-950 p-4 rounded-2xl inline-block border border-slate-800 relative">
                          {/* Simulated UPI pay QR code with logo inside */}
                          <img
                            alt="Mock QR Code Scan to pay"
                            className="w-40 h-40 object-contain mx-auto border-4 border-white rounded-lg"
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=syncpad@upi%26pn=SyncPad%20Workspace%26am=${selectedPlan.price[billingPeriod]}%26cu=INR`}
                          />
                        </div>
                        <p className="text-xs text-slate-400 leading-normal max-w-sm mx-auto">
                          Scan the dynamic QR code above using any UPI app (GPay, PhonePe, Paytm) and enter the Transaction / UTR reference ID below to confirm.
                        </p>
                        
                        <div className="text-left space-y-1.5">
                          <label className="text-xs font-black uppercase tracking-wider text-slate-200">
                            Transaction ID / UTR Number
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter 12-digit UPI UTR number..."
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-mono"
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {checkoutMethod === "razorpay" && (
                      <div className="space-y-4 text-left">
                        
                        {/* Razorpay Simulator Styling */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Razorpay Checkout Sandbox
                            </p>
                          </div>
                          <p className="text-xs font-extrabold text-primary font-mono">
                            SECURE GATEWAY
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                            Cardholder Name
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g., Yogin Kumar"
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary transition-all font-semibold"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                            Card Number
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="4111 2222 3333 4444"
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary transition-all font-mono"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                              Expiry Date
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="MM/YY"
                              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary transition-all font-mono"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                              CVV / Card Code
                            </label>
                            <input
                              type="password"
                              required
                              maxLength="3"
                              placeholder="•••"
                              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary transition-all font-mono"
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-4 bg-primary hover:bg-primary/95 text-on-primary font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer mt-2"
                    >
                      Authorize & Pay ₹{selectedPlan.price[billingPeriod].toLocaleString("en-IN")}
                    </button>
                  </form>
                </div>
              )}

              {paymentStep === "processing" && (
                <div className="py-12 text-center space-y-6">
                  <div className="w-16 h-16 border-4 border-slate-700 border-t-primary rounded-full animate-spin mx-auto" />
                  <div className="space-y-1.5 animate-pulse">
                    <h3 className="text-lg font-black text-white">
                      Processing Payment Authorization...
                    </h3>
                    <p className="text-xs text-slate-400">
                      Syncing transaction reference with gateway. Please do not close or refresh.
                    </p>
                  </div>
                </div>
              )}

              {paymentStep === "success" && (
                <div className="py-8 text-center space-y-6 animate-in zoom-in-95 duration-500">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/5">
                    <span className="material-symbols-outlined text-4xl">check_circle</span>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-extrabold text-white">
                      Payment Successful!
                    </h2>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Thank you for your trust! Your SyncPad account has been instantly updated to the <strong className="text-white">{selectedPlan.name} Workspace</strong>. Welcome to premium asset flow.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={handleCloseCheckout}
                      className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      Return to Workspace
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}

export default Pricing;
