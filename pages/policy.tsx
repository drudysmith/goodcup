import Layout from '../components/Layout';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Policy() {
  const router = useRouter();

  return (
    <Layout>
      <Head>
        <title>SMS Terms & Privacy Policy - Goodcup</title>
      </Head>
      
      {/* Hide market/cupgrades icon and cart icon on this page */}
      <style>{`
        header nav > div:first-child {
          display: none !important;
        }
        header nav > div:last-child > div:first-child {
          display: none !important;
        }
        header nav {
          justify-content: center !important;
        }
        header nav > div:last-child {
          position: absolute;
          right: 1rem;
        }
        @media (min-width: 1280px) {
          header nav > div:last-child {
            right: 3rem;
          }
        }
      `}</style>

      <div className="site-section-bg -mt-[120px] pt-[120px] pb-32 md:pb-48">
        <div className="w-full max-w-4xl mx-auto px-6 lg:px-12">
          
          {/* SMS Terms Section */}
          <section className="mb-16 mt-16 md:mt-24">
            <h1 className="text-4xl md:text-5xl font-bold mb-8 text-gray-700">
              Goodcup Text Updates (SMS Terms)
            </h1>
            
            <div className="space-y-6 text-gray-700 text-lg leading-relaxed">
              <p>
                Text GOODCUP to our number to receive Goodcup recipes, order updates, event news, and occasional special offers.
              </p>
              
              <p>
                By texting GOODCUP, you consent to receive recurring SMS messages from Goodcup related to your orders, pickup reminders, and promotions.
              </p>
              
              <p>
                Message and data rates may apply. Message frequency varies.
              </p>
              
              <p>
                Reply STOP to opt out at any time. Reply HELP for help.
              </p>
              
              <p>
                Consent is not a condition of purchase.
              </p>
              
              <p>
                See our Privacy Policy for details on how we handle your data.
              </p>
            </div>

            {/* Back Button */}
            <div className="mt-12 flex justify-center">
              <button
                onClick={() => router.back()}
                className="px-8 py-3 bg-transparent text-text-foreground rounded-full hover:bg-neutral-muted transition-all duration-200 font-normal text-base border border-text-soft"
                style={{ fontFamily: 'Manrope, Arial, Helvetica, sans-serif' }}
              >
                &lt;&lt; Back
              </button>
            </div>
          </section>

          {/* Terms of Service Section */}
          <section className="mt-16 pt-16 border-t border-text-soft/20">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-text-soft">
              Terms of Service
            </h2>
            
            <div className="space-y-6 text-text-soft text-lg leading-relaxed">
              <p>
                Welcome to Goodcup — we make the best drinks, in powder and liquid form, for your health, body, and mind. By using our site or products, you agree to these terms. If you have any health conditions or concerns, it's your responsibility to review our ingredient list and check for any contraindications or substances you shouldn't consume. Our products are intended for personal, lawful use only.
              </p>
              
              <p>
                Payments are processed securely through the Stripe portal. Refunds are available within 30 days of purchase; requests can be sent to refunds@goodcup.me. Subscriptions can be renewed or managed by creating an account and accessing your dashboard, where you can also view past orders. We do our best to provide accurate information and quality products, but we are not liable for indirect, incidental, or special damages resulting from the use of our products or services.
              </p>
              
              <p>
                These terms may change at any time. The version you are reading is current as of August 2025. For any questions, email us at hello@goodcup.me.
              </p>
            </div>

            {/* Back Button */}
            <div className="mt-12 flex justify-center">
              <button
                onClick={() => router.back()}
                className="px-8 py-3 bg-transparent text-text-foreground rounded-full hover:bg-neutral-muted transition-all duration-200 font-normal text-base border border-text-soft"
                style={{ fontFamily: 'Manrope, Arial, Helvetica, sans-serif' }}
              >
                &lt;&lt; Back
              </button>
            </div>
          </section>

          {/* Privacy Policy Section */}
          <section className="mt-16 pt-16 border-t border-text-soft/20">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-text-soft">
              Privacy Policy
            </h2>
            
            <div className="space-y-6 text-text-soft text-lg leading-relaxed">
              <p>
                Goodcup respects your privacy and is committed to protecting your personal information. This policy explains what data we collect, how we use it, and how you can manage your information.
              </p>
              
              <p>
                When you interact with Goodcup—whether through our website, SMS messaging, market kiosks, or other channels—we may collect basic contact information such as your name, phone number, email address, and any details you voluntarily share with us.
              </p>
              
              <p>
                If you opt in to receive SMS messages from Goodcup, we use your phone number solely for sending order updates, pickup reminders, customer support messages, recipes, product tips, and occasional promotional offers. Message frequency varies.
              </p>
              
              <p>
                We never sell or share your personal information with third parties for their marketing purposes. We may use trusted service providers (such as messaging or payment platforms) to deliver our services, and these providers only receive the minimum information required to perform their function.
              </p>
              
              <p>
                You can opt out of SMS messaging at any time by replying STOP. You may request access to, correction of, or deletion of your information by contacting us directly at support@goodcup.me.
              </p>
              
              <p>
                We retain your information only as long as necessary to provide services, comply with laws, or maintain legitimate business records such as order history.
              </p>
              
              <p>
                By using our website or opting in to SMS messaging, you agree to the terms outlined in this Privacy Policy.
              </p>
              
              <p>
                If we update this policy, changes will be posted on this page with the effective date.
              </p>
            </div>

            {/* Back Button */}
            <div className="mt-12 flex justify-center">
              <button
                onClick={() => router.back()}
                className="px-8 py-3 bg-transparent text-text-foreground rounded-full hover:bg-neutral-muted transition-all duration-200 font-normal text-base border border-text-soft"
                style={{ fontFamily: 'Manrope, Arial, Helvetica, sans-serif' }}
              >
                &lt;&lt; Back
              </button>
            </div>
          </section>

        </div>
      </div>
    </Layout>
  );
}

