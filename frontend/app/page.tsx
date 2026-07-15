"use client";

import { useRouter } from "next/navigation";
import { HERO_BACKGROUND_IMAGE } from "@/lib/constants";

export default function Home() {
  const router = useRouter();
  return (
    <main className="w-full">
      {/* Hero Section with Grey to White Gradient */}
      <section className="relative w-full bg-gradient-to-b from-gray-800 to-white">
        {/* Background Image Section - 50vh */}
        <div
          className="relative w-full h-[50vh] bg-cover bg-center"
          style={{
            backgroundImage: `url("${HERO_BACKGROUND_IMAGE}")`,
          }}
        >
          {/* Dark overlay for better text visibility */}
          <div className="absolute inset-0 bg-black/30"></div>
        </div>

        {/* Title positioned half on image, half outside */}
        <div className="relative px-4 text-center -translate-y-1/2">
          <h1 className="text-6xl md:text-7xl font-bold text-white drop-shadow-lg">
            ProcureNext
          </h1>
        </div>

        {/* Buttons Section */}
        <div className="relative pt-12 pb-16 px-4 flex gap-6 justify-center flex-wrap">
          <button
            onClick={() => router.push("/login")}
            className="px-8 py-3 bg-gradient-to-br from-gray-600 to-gray-800 text-white font-semibold rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:scale-105 border border-gray-500"
          >
            Login
          </button>
          <button
            onClick={() => router.push("/signup-master")}
            className="px-8 py-3 bg-gradient-to-br from-gray-50 to-gray-200 text-gray-700 font-semibold border-2 border-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-300 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg hover:scale-105"
          >
            Sign Up
          </button>
        </div>
      </section>

      {/* About Us Section */}
      <section className="w-full py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
            About Us
          </h2>
          <div className="w-16 h-1 bg-gray-700 mx-auto mb-12"></div>

          <div className="grid md:grid-cols-2 gap-12 mb-16">
            {/* Left Column */}
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Our Mission
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                At ProcureNext, we believe that procurement should be simple,
                transparent, and efficient. Our mission is to revolutionize the
                way organizations manage their procurement processes by
                providing cutting-edge technology solutions.
              </p>
              <p className="text-gray-600 leading-relaxed">
                We are committed to helping businesses reduce costs, improve
                supplier relationships, and streamline their supply chain
                operations.
              </p>
            </div>

            {/* Right Column */}
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Why Choose Us?
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-gray-700 font-bold text-xl">✓</span>
                  <span className="text-gray-600">
                    Industry-leading automation tools
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-700 font-bold text-xl">✓</span>
                  <span className="text-gray-600">
                    Real-time analytics and reporting
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-700 font-bold text-xl">✓</span>
                  <span className="text-gray-600">
                    Dedicated customer support 24/7
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-700 font-bold text-xl">✓</span>
                  <span className="text-gray-600">
                    Secure and compliant platform
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid md:grid-cols-3 gap-8 pt-12 border-t border-gray-200">
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-700 mb-2">500+</p>
              <p className="text-gray-600">Active Clients</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-700 mb-2">$2B+</p>
              <p className="text-gray-600">Procurement Value Managed</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-700 mb-2">99.9%</p>
              <p className="text-gray-600">Uptime Guarantee</p>
            </div>
          </div>

          {/* Admin Portal Section */}
          <div className="mt-16 pt-12 border-t border-gray-200">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-8 md:p-10 text-center shadow-xl border border-gray-700">
              <div className="flex justify-center mb-4">
                <svg
                  className="w-10 h-10 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Admin Portal
              </h3>
              <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                Platform administrators can access the management dashboard to
                oversee operations, verify organizations, and manage users.
              </p>
              <button
                onClick={() => router.push("/admin-login")}
                className="px-8 py-3 bg-gradient-to-br from-gray-50 to-gray-200 text-gray-800 font-semibold rounded-lg hover:from-white hover:to-gray-100 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg hover:scale-105 border border-gray-400"
              >
                Admin Login
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
