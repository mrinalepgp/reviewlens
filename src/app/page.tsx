import Link from "next/link";
import { redirect } from "next/navigation";
import { PLAN_LIST, formatInr } from "@/lib/pricing";

export default async function Home(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const code = searchParams?.code;
  if (code && typeof code === 'string') {
    redirect(`/auth/callback?code=${code}&next=/reset-password`);
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 selection:bg-indigo-500/30 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-neutral-950/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-base shadow-[0_0_15px_rgba(79,70,229,0.4)]">
              R
            </div>
            <span className="text-lg font-bold tracking-tight">ReviewLens</span>
          </div>
          <nav className="hidden md:flex gap-6 text-xs font-semibold text-neutral-400">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="#docs" className="hover:text-white transition-colors">Documentation</Link>
          </nav>
          <div className="flex gap-3 items-center">
            <Link href="/login" className="text-xs font-semibold text-neutral-300 hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/login" className="rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-black hover:bg-neutral-200 transition-colors shadow-sm">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-10 pb-10 sm:pt-14 sm:pb-12 lg:pb-14">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[700px] h-[400px] bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-blue-500/20 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-indigo-300 mb-4 shadow-sm">
              <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              ReviewLens v1.0 is live — Stop Return Bleed
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 max-w-4xl mx-auto leading-tight sm:leading-none">
              Stop E-Commerce Return Bleed with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-300 to-cyan-400">
                AI Intelligence.
              </span>
            </h1>
            
            <p className="text-base sm:text-lg text-neutral-400 mb-6 max-w-2xl mx-auto leading-relaxed">
              Instantly analyze Flipkart &amp; Meesho reviews, pinpoint root-cause defects, and recover lost margins before they hurt your bottom line.
            </p>
            
            <div className="flex items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Link 
                href="/login" 
                className="group relative flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-[0_0_20px_rgba(79,70,229,0.35)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
              >
                Start Free Trial
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <Link 
                href="/login" 
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-2.5 rounded-full font-semibold text-sm transition-all"
              >
                Sign In
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto animate-in fade-in duration-700 delay-150">
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
                <span className="text-2xl font-black text-white">₹2.4Cr+</span>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">Capital Protected</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
                <span className="text-2xl font-black text-white">12,000+</span>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">Defect Clusters Resolved</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
                <span className="text-2xl font-black text-white">1.8M+</span>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">Reviews Analyzed</span>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-center gap-3 animate-in fade-in duration-700 delay-200">
              <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest text-center">
                Engineered for high-volume sellers on
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <div className="px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] flex items-center gap-2 hover:bg-white/[0.06] transition-colors cursor-default">
                  <div className="w-4 h-4 rounded-full bg-[#f9ce34] flex items-center justify-center text-black font-extrabold text-[9px]">F</div>
                  <span className="text-neutral-300 font-medium text-xs">Flipkart</span>
                </div>
                <div className="px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] flex items-center gap-2 hover:bg-white/[0.06] transition-colors cursor-default">
                  <div className="w-4 h-4 rounded-full bg-[#f43397] flex items-center justify-center text-white font-extrabold text-[9px]">M</div>
                  <span className="text-neutral-300 font-medium text-xs">Meesho</span>
                </div>
                <div className="px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] flex items-center gap-2 hover:bg-white/[0.06] transition-colors cursor-default">
                  <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-white font-extrabold text-[9px]">D</div>
                  <span className="text-neutral-300 font-medium text-xs">D2C Brands</span>
                </div>
              </div>
            </div>

            {/* Glowing Product Console Preview */}
            <div className="mt-6 relative max-w-4xl mx-auto rounded-xl border border-white/10 bg-neutral-900/50 p-2 sm:p-3 shadow-2xl backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/15 via-transparent to-transparent pointer-events-none" />
              <div className="h-52 sm:h-64 w-full rounded-lg border border-white/5 bg-neutral-950 flex flex-col items-center justify-center relative overflow-hidden p-4">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(79,70,229,0.12),transparent_70%)]" />
                <div className="relative flex flex-col items-center gap-4 z-10 w-full max-w-lg">
                  <div className="flex gap-4 w-full justify-center">
                    <div className="flex-1 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-center backdrop-blur-md">
                      <div className="text-rose-400 font-mono font-black text-2xl">85%</div>
                      <div className="text-neutral-400 text-[10px] mt-1 uppercase tracking-wider font-semibold">Return Risk Index</div>
                    </div>
                    <div className="flex-1 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-center backdrop-blur-md">
                      <div className="text-indigo-400 font-mono font-black text-2xl">20-30%</div>
                      <div className="text-neutral-400 text-[10px] mt-1 uppercase tracking-wider font-semibold">Est. Margin Bleed</div>
                    </div>
                  </div>

                  {/* Critical Defect Header */}
                  <div className="w-full p-3 border border-white/10 bg-white/5 rounded-lg flex flex-col gap-2.5 backdrop-blur-md shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                        </div>
                        <div className="text-xs text-neutral-200 font-semibold">Critical Defect Factor: Sizing &amp; Material Stress</div>
                      </div>
                      <div className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[9px] uppercase rounded-full font-bold tracking-wider">Action Required</div>
                    </div>

                    {/* Defect Breakdown Bars */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-neutral-400">
                          <span>Material &amp; Build Integrity Discrepancy</span>
                          <span className="text-neutral-300 font-mono">60%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: '60%' }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-neutral-400">
                          <span>Sizing &amp; Dimensional Spec Mismatch</span>
                          <span className="text-neutral-300 font-mono">25%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: '25%' }} />
                        </div>
                      </div>
                    </div>

                    {/* Actionable Mitigation Preview Badge */}
                    <div className="flex items-center justify-between p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span className="text-xs text-emerald-300 font-medium">Automated Supplier Quality Directive Ready</span>
                      </div>
                      <span className="text-[9px] text-emerald-400/90 uppercase font-bold tracking-wider">Verified ✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-10 sm:py-12 bg-neutral-950 border-t border-white/5 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[400px] bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Everything a modern seller needs</h2>
              <p className="text-sm text-neutral-400 max-w-xl mx-auto">Stop guessing return causes. Let our intelligent pipeline extract, interpret, and resolve raw customer feedback.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
              {/* Card 1 */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 hover:border-white/20 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center mb-4 text-rose-400 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">AI Financial Bleed Calculator</h3>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
                  Quantify preventable return losses and margins. Instantly see how much capital is leaking due to recurring product flaws.
                </p>
              </div>

              {/* Card 2 */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 hover:border-white/20 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-400 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">Defect Taxonomy Engine</h3>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
                  Isolate root hardware, performance, and sizing complaints. Categorize and map vernacular feedback to exact manufacturing issues.
                </p>
              </div>

              {/* Card 3 */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 hover:border-white/20 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4 text-cyan-400 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">1-Click Mitigation Playbook</h3>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
                  Instant supplier quality memos &amp; listing optimization copy. Generate automated action plans to stop capital drain immediately.
                </p>
              </div>

              {/* Card 4 */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 hover:border-white/20 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-400 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">Shield Authenticity Radar</h3>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
                  Detect review bombing, fake accounts, and generate marketplace dispute tickets to protect your seller account health.
                </p>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="mt-10 sm:mt-12 rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-neutral-900/60 to-neutral-950/40 p-6 sm:p-8 text-center relative overflow-hidden">
              <div className="relative z-10 max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold text-white mb-2">Ready to stop preventable return losses?</h3>
                <p className="text-xs sm:text-sm text-neutral-400 mb-6">Join top D2C brands proactively safeguarding margins every day.</p>
                <Link 
                  href="/login" 
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-[0_0_20px_rgba(79,70,229,0.35)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
                >
                  Start Your Free Trial &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-10 sm:py-12 bg-neutral-950 border-t border-white/5 relative">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Simple, Transparent Pricing</h2>
              <p className="text-sm text-neutral-400 max-w-xl mx-auto">Scale your margin recovery with a plan tailored for your catalog volume.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {PLAN_LIST.map((plan) => (
                <div
                  key={plan.code}
                  className={
                    plan.highlighted
                      ? "p-6 rounded-xl bg-gradient-to-b from-indigo-900/20 to-transparent border border-indigo-500/30 flex flex-col relative shadow-lg"
                      : "p-6 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col"
                  }
                >
                  {plan.highlighted && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-0.5 bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                  <div className="text-3xl font-black mb-1">
                    {formatInr(plan.priceInr)}
                    <span className="text-sm text-neutral-500 font-normal"> /mo</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mb-4 leading-snug">{plan.tagline}</p>
                  <ul className="space-y-3 mb-6 flex-1 text-xs text-neutral-400">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <svg className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login"
                    className={
                      plan.highlighted
                        ? "w-full py-2.5 rounded-full text-center bg-indigo-600 hover:bg-indigo-500 transition-colors font-bold text-xs text-white shadow-md shadow-indigo-500/25"
                        : "w-full py-2.5 rounded-full text-center border border-white/10 hover:bg-white/5 transition-colors font-semibold text-xs"
                    }
                  >
                    {plan.code === 'enterprise' ? 'Contact Sales' : 'Get Started'}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ/Docs Section */}
        <section id="docs" className="py-10 sm:py-12 bg-neutral-950 border-t border-white/5">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Frequently Asked Questions</h2>
              <p className="text-sm text-neutral-400 max-w-xl mx-auto">Everything you need to know about how ReviewLens safeguards your e-commerce margins.</p>
            </div>
            <div className="space-y-4">
              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                <h3 className="text-base font-semibold mb-1.5 text-white">How does ReviewLens extract product review data securely?</h3>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">We utilize a resilient, real-time extraction pipeline that mimics natural navigation to aggregate public review data without triggering marketplace anti-bot blocks.</p>
              </div>
              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                <h3 className="text-base font-semibold mb-1.5 text-white">How accurate is the Margin Loss formula?</h3>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">Highly accurate. Our intelligence engine calculates margin bleed by dynamically weighting average selling price (ASP), reverse shipping logistics penalties, and verified defect complaint ratios.</p>
              </div>
              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                <h3 className="text-base font-semibold mb-1.5 text-white">Can I analyze competitor products?</h3>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">Yes. Because ReviewLens operates on public URL intelligence, no seller API credentials are required. Simply paste any Flipkart or Meesho product URL to benchmark competitor defects instantly.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-neutral-950 py-6">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 opacity-80">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-indigo-600 text-white font-bold text-[10px]">
              R
            </div>
            <span className="text-xs font-semibold">ReviewLens</span>
          </div>
          <p className="text-xs text-neutral-500">
            &copy; {new Date().getFullYear()} ReviewLens Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
