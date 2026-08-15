import Link from "next/link";

export default function Home() {
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
        <section className="relative overflow-hidden pt-24 pb-32 sm:pt-32 sm:pb-40 lg:pb-48">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-indigo-300 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
              ReviewLens v1.0 is now live
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8">
              Decode customer intent with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                AI vernacular analysis.
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Instantly scrape e-commerce reviews and leverage AI to uncover hidden sentiments, local dialects, and buying trends that standard sentiment analysis misses.
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

            <p className="mt-16 text-sm font-semibold text-neutral-500 uppercase tracking-widest animate-in fade-in duration-1000 delay-300">
              Engineered for high-volume sellers on Flipkart, Meesho & D2C Marketplaces
            </p>

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
                  <div className="w-full max-w-lg p-4 border border-white/10 bg-white/5 rounded-xl flex items-center justify-between gap-4 backdrop-blur-md shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </div>
                      <div className="text-sm text-neutral-200 font-medium">Critical Defect: Size Misalignment</div>
                    </div>
                    <div className="px-3 py-1 bg-red-500/20 text-red-300 text-xs rounded-full font-semibold">ACTION REQ</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-neutral-950 border-t border-white/5">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
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
