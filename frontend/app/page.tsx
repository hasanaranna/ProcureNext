"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return (
    <main className="w-full">
      {/* ── Sticky Navigation ──────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-dark">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">ProcureNext</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/login")}
              className="px-5 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors duration-200"
            >
              Login
            </button>
            <button
              onClick={() => router.push("/signup-master")}
              className="px-5 py-2 text-sm font-semibold bg-accent-500 hover:bg-accent-600 text-white rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────── */}
      <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-400/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-navy-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        </div>
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent-500/30 bg-accent-500/10 text-accent-300 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
            Enterprise Procurement Platform
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-[1.1] tracking-tight mb-6">
            Procurement,{' '}
            <span className="text-gradient">Reimagined</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Streamline your entire procurement workflow — from tender creation to bid evaluation — on a single, secure, enterprise-grade platform.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={() => router.push("/login")}
              className="px-8 py-3.5 bg-white text-navy-900 font-bold rounded-xl hover:bg-slate-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 text-base"
            >
              Login to Dashboard
            </button>
            <button
              onClick={() => router.push("/signup-master")}
              className="px-8 py-3.5 bg-gradient-to-r from-accent-500 to-accent-600 text-white font-bold rounded-xl hover:from-accent-600 hover:to-accent-700 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 text-base"
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500 animate-bounce">
          <span className="text-xs font-medium">Scroll to explore</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* ── About Us Section ───────────────────────────── */}
      <section className="w-full py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-accent-600 uppercase tracking-widest mb-3">About Us</p>
            <h2 className="text-4xl md:text-5xl font-black text-navy-900 mb-4">
              Why ProcureNext?
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              We believe procurement should be simple, transparent, and efficient.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 mb-20">
            {/* Left Column — Mission */}
            <div className="bg-gradient-to-br from-navy-900 to-navy-800 rounded-3xl p-8 md:p-10 text-white shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-accent-500/20 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                At ProcureNext, we revolutionize the way organizations manage their procurement processes by providing cutting-edge technology solutions.
              </p>
              <p className="text-slate-400 leading-relaxed">
                We are committed to helping businesses reduce costs, improve supplier relationships, and streamline their supply chain operations.
              </p>
            </div>

            {/* Right Column — Features */}
            <div className="flex flex-col gap-4">
              {[
                { icon: '⚡', title: 'Industry-leading automation tools', desc: 'Automate repetitive procurement tasks and focus on strategic decisions.' },
                { icon: '📊', title: 'Real-time analytics and reporting', desc: 'Get instant insights into your procurement performance metrics.' },
                { icon: '🛡️', title: 'Dedicated customer support 24/7', desc: 'Our expert team is always ready to help you succeed.' },
                { icon: '🔒', title: 'Secure and compliant platform', desc: 'Enterprise-grade security with regulatory compliance built-in.' },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200 bg-white hover:shadow-lg hover:border-accent-200 transition-all duration-300 group"
                >
                  <div className="w-11 h-11 rounded-xl bg-accent-50 flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-accent-100 transition-colors duration-300">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-navy-900 mb-1">{feature.title}</h4>
                    <p className="text-sm text-slate-500">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { value: '500+', label: 'Active Clients', icon: '🏢' },
              { value: '$2B+', label: 'Procurement Value Managed', icon: '💰' },
              { value: '99.9%', label: 'Uptime Guarantee', icon: '🟢' },
            ].map((stat, i) => (
              <div
                key={i}
                className="text-center p-8 rounded-2xl bg-slate-50 border border-slate-200 hover:shadow-xl hover:border-accent-200 hover:scale-[1.02] transition-all duration-300"
              >
                <div className="text-3xl mb-3">{stat.icon}</div>
                <p className="text-4xl font-black text-navy-900 mb-1">{stat.value}</p>
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Admin Portal Section */}
          <div className="mt-20">
            <div className="bg-gradient-to-br from-navy-950 to-navy-900 rounded-3xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-400/5 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Admin Portal</h3>
                <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto leading-relaxed">
                  Platform administrators can access the management dashboard to oversee operations, verify organizations, and manage users.
                </p>
                <button
                  onClick={() => router.push("/admin-login")}
                  className="px-8 py-3 bg-white text-navy-900 font-bold rounded-xl hover:bg-slate-100 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  Admin Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="w-full py-8 px-6 bg-navy-950 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-400">ProcureNext</span>
          </div>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} ProcureNext. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
