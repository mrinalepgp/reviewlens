import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const code = searchParams?.code;
  if (code && typeof code === 'string') {
    redirect(`/auth/callback?code=${code}&next=/reset-password`);
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 selection:bg-indigo-500/30">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-neutral-950/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xl">
              R
            </div>
            <span className="text-xl font-bold tracking-tight">ReviewLens</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-neutral-400">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="#docs" className="hover:text-white transition-colors">Documentation</Link>
          </nav>
          <div className="flex gap-4 items-center">
            <Link href="/login" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/login" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-16 sm:pt-24 sm:pb-20 lg:pb-24">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[600px] bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-indigo-300 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
              ReviewLens v1.0 is now live
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8">
              Stop E-Commerce Return Bleed with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                AI Intelligence.
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Instantly analyze Flipkart & Meesho reviews, pinpoint root-cause defects, and recover lost margins before they hurt your bottom line.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            <Link 
              href="/login" 
              className="group relative flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-full font-medium text-lg transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
            >
              Start Free Trial
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <Link 
              href="/login" 
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-3.5 rounded-full font-medium text-lg transition-all"
            >
              Sign In
            </Link>
            </div>

            <div className="mt-12 flex flex-col items-center gap-6 animate-in fade-in duration-1000 delay-300">
              <p className="text-sm font-semibold text-neutral-500 uppercase tracking-widest text-center">
                Engineered for high-volume sellers on
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <div className="px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] flex items-center gap-2 hover:bg-white/[0.06] transition-colors">
                  <div className="w-5 h-5 rounded-full bg-[#f9ce34] flex items-center justify-center text-black font-bold text-[10px]">F</div>
                  <span className="text-neutral-300 font-medium text-sm">Flipkart</span>
                </div>
                <div className="px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] flex items-center gap-2 hover:bg-white/[0.06] transition-colors">
                  <div className="w-5 h-5 rounded-full bg-[#f43397] flex items-center justify-center text-white font-bold text-[10px]">M</div>
                  <span className="text-neutral-300 font-medium text-sm">Meesho</span>
                </div>
                <div className="px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] flex items-center gap-2 hover:bg-white/[0.06] transition-colors">
                  <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-[10px]">D</div>
                  <span className="text-neutral-300 font-medium text-sm">D2C Brands</span>
                </div>
              </div>
            </div>

            {/* Glowing Product Console Preview */}
            <div className="mt-8 relative max-w-4xl mx-auto rounded-2xl border border-white/10 bg-neutral-900/50 p-2 sm:p-4 shadow-2xl backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 via-transparent to-transparent pointer-events-none" />
              <div className="h-64 sm:h-96 w-full rounded-xl border border-white/5 bg-neutral-950 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(79,70,229,0.15),transparent_70%)]" />
                <div className="relative flex flex-col items-center gap-6 z-10 w-full px-4">
                  <div className="flex gap-4 sm:gap-8 w-full max-w-lg justify-center">
                    <div className="flex-1 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center backdrop-blur-md">
                      <div className="text-red-400 font-mono font-bold text-3xl">85%</div>
                      <div className="text-neutral-400 text-xs mt-2 uppercase tracking-wider font-semibold">Return Risk</div>
                    </div>
                    <div className="flex-1 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-center backdrop-blur-md">
                      <div className="text-indigo-400 font-mono font-bold text-3xl">20-30%</div>
                      <div className="text-neutral-400 text-xs mt-2 uppercase tracking-wider font-semibold">Margin Loss</div>
                    </div>
                  </div>
                  {/* Critical Defect Header */}
                  <div className="w-full max-w-lg p-4 border border-white/10 bg-white/5 rounded-xl flex flex-col gap-4 backdrop-blur-md shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </div>
                        <div className="text-sm text-neutral-200 font-medium">Critical Defect: Size Misalignment</div>
                      </div>
                      <div className="px-3 py-1 bg-red-500/20 text-red-300 text-[10px] uppercase rounded-full font-bold tracking-widest">Action Req</div>
                    </div>

                    {/* Defect Breakdown Bars */}
                    <div className="space-y-3 pt-3 border-t border-white/5">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-neutral-400">
                          <span>Performance Issues</span>
                          <span className="text-neutral-300">60%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: '60%' }} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-neutral-400">
                          <span>Sizing Complaints</span>
                          <span className="text-neutral-300">20%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: '20%' }} />
                        </div>
                      </div>
                    </div>

                    {/* Actionable Mitigation Preview Badge */}
                    <div className="mt-2 flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span className="text-xs text-emerald-300 font-medium">Mitigation Plan Generated</span>
                      </div>
                      <span className="text-[10px] text-emerald-400/80 uppercase font-semibold tracking-wider">Ready to apply</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 sm:py-20 bg-neutral-950 border-t border-white/5 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[600px] bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Everything a modern seller needs</h2>
              <p className="text-neutral-400 max-w-xl mx-auto">Stop guessing what your customers want. Let our intelligent pipeline extract, interpret, and present the raw truth.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Card 1 */}
              <div className="p-8 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 hover:border-white/20 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-6 text-red-400 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">AI Financial Bleed Calculator</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Quantify preventable return losses and margins. Instantly see how much money is leaking due to recurring product flaws.
                </p>
              </div>

              {/* Card 2 */}
              <div className="p-8 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 hover:border-white/20 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Defect Taxonomy Engine</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Isolate root hardware, performance, and sizing complaints. Categorize and map vernacular feedback to exact manufacturing issues.
                </p>
              </div>

              {/* Card 3 */}
              <div className="p-8 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 hover:border-white/20 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">1-Click Mitigation Playbook</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Instant supplier quality memos & listing optimization copy. Generate automated action plans to stop the bleeding immediately.
                </p>
              </div>

              {/* Card 4 */}
              <div className="p-8 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 hover:border-white/20 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Shield Authenticity Radar</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Detect review bombing, fake accounts, and generate marketplace dispute tickets to protect your brand health.
                </p>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="mt-20 sm:mt-24 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-900/40 to-neutral-900/40 p-8 sm:p-12 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20" />
              <div className="relative z-10 max-w-2xl mx-auto">
                <h3 className="text-3xl font-bold text-white mb-4">Ready to stop preventable return losses?</h3>
                <p className="text-neutral-400 mb-8">Join the top D2C brands proactively saving margins every day.</p>
                <Link 
                  href="/login" 
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-full font-medium text-lg transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
                >
                  Analyze Your Catalog Free &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-neutral-950 border-t border-white/5 relative">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Simple, Transparent Pricing</h2>
              <p className="text-neutral-400 max-w-xl mx-auto">Scale your margin recovery with a plan that fits your volume.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Starter */}
              <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col">
                <h3 className="text-xl font-semibold mb-2">Starter</h3>
                <div className="text-4xl font-bold mb-6">₹0<span className="text-lg text-neutral-500 font-normal"> /mo</span></div>
                <ul className="space-y-4 mb-8 flex-1 text-sm text-neutral-400">
                  <li className="flex items-center gap-2"><svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> 5 Product Scans/mo</li>
                  <li className="flex items-center gap-2"><svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Standard Flipkart/Meesho Parser</li>
                  <li className="flex items-center gap-2"><svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Defect Breakdown</li>
                </ul>
                <Link href="/login" className="w-full py-3 rounded-full text-center border border-white/10 hover:bg-white/5 transition-colors font-medium">Start Free</Link>
              </div>
              {/* Growth */}
              <div className="p-8 rounded-2xl bg-gradient-to-b from-indigo-900/20 to-transparent border border-indigo-500/30 flex flex-col relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-full">Most Popular</div>
                <h3 className="text-xl font-semibold mb-2">Growth Pro</h3>
                <div className="text-4xl font-bold mb-6">₹2,999<span className="text-lg text-neutral-500 font-normal"> /mo</span></div>
                <ul className="space-y-4 mb-8 flex-1 text-sm text-neutral-400">
                  <li className="flex items-center gap-2"><svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Unlimited Scrapes</li>
                  <li className="flex items-center gap-2"><svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Vernacular NLP</li>
                  <li className="flex items-center gap-2"><svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Automated Supplier Memos</li>
                  <li className="flex items-center gap-2"><svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Profit Bleed Calculator</li>
                </ul>
                <Link href="/login" className="w-full py-3 rounded-full text-center bg-indigo-600 hover:bg-indigo-700 transition-colors font-medium text-white shadow-lg shadow-indigo-500/25">Get Started</Link>
              </div>
              {/* Enterprise */}
              <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col">
                <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
                <div className="text-4xl font-bold mb-6">Custom</div>
                <ul className="space-y-4 mb-8 flex-1 text-sm text-neutral-400">
                  <li className="flex items-center gap-2"><svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Multi-Brand Radar</li>
                  <li className="flex items-center gap-2"><svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> API Webhooks</li>
                  <li className="flex items-center gap-2"><svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Competitor Benchmarking</li>
                  <li className="flex items-center gap-2"><svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Dedicated Dispute Specialist</li>
                </ul>
                <Link href="/login" className="w-full py-3 rounded-full text-center border border-white/10 hover:bg-white/5 transition-colors font-medium">Contact Sales</Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ/Docs Section */}
        <section id="docs" className="py-20 bg-neutral-950 border-t border-white/5">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Frequently Asked Questions</h2>
              <p className="text-neutral-400 max-w-xl mx-auto">Everything you need to know about how ReviewLens protects your margins.</p>
            </div>
            <div className="space-y-6">
              <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                <h3 className="text-lg font-semibold mb-2 text-white">How does ReviewLens bypass marketplace bot protections?</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">We utilize a resilient, real-time extraction pipeline that mimics natural user navigation. This allows us to securely aggregate public review data without triggering CAPTCHAs or being blocked by marketplace anti-bot systems.</p>
              </div>
              <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                <h3 className="text-lg font-semibold mb-2 text-white">How accurate is the Margin Loss formula?</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">Highly accurate. Our intelligence engine calculates margin bleed by dynamically weighting your logistics average selling price (ASP), reverse shipping penalties, and return frequency based on verified defect complaints.</p>
              </div>
              <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                <h3 className="text-lg font-semibold mb-2 text-white">Can I analyze competitor products?</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">Yes. Because ReviewLens operates on 100% public URL intelligence, you do not need seller credentials to scrape a listing. Just paste any Flipkart or Meesho product URL to benchmark competitor defects instantly.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-neutral-950 py-12">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-80">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white font-bold text-xs">
              R
            </div>
            <span className="text-sm font-semibold">ReviewLens</span>
          </div>
          <p className="text-sm text-neutral-500">
            &copy; {new Date().getFullYear()} ReviewLens Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
