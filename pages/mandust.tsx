import Layout from '../components/Layout';
import Section from '../components/Section';
import { useCartStore } from '../store/cartStore';
import { useState } from 'react';

export default function ManDust() {
  const addItem = useCartStore((state) => state.addItem);
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  // Dummy product data for Man Dust
  const manDustProduct = {
    id: 'mandust_product',
    name: 'Man Dust',
    description: 'The ultimate testosterone support supplement for men. Scientifically formulated with premium ingredients.',
    images: ['/placeholder-mandust.jpg'], // Placeholder image
    price: {
      monthly: { id: 'mandust_monthly', amount: 8900, interval: 'month' }, // $89/month
      quarterly: { id: 'mandust_quarterly', amount: 24900, interval: '3 months' }, // $249/3 months
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    const price = manDustProduct.price[selectedPlan as keyof typeof manDustProduct.price];
    const buttonElement = e.currentTarget as HTMLElement;
    
    await addItem({
      productId: manDustProduct.id,
      priceId: price.id,
      quantity: 1
    }, {
      productImage: manDustProduct.images[0],
      startElement: buttonElement
    });
  };

  return (
    <Layout>
      <div className="site-section-bg min-h-screen">
        {/* Hero Section */}
        <Section
          title="Man Dust"
          text="Hands down the best T supplement for men."
          bgColor="bg-transparent"
          textColor="text-text-primary"
        />

        {/* Product Details */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Product Image */}
            <div className="flex justify-center">
              <div className="w-80 h-80 bg-surface border border-neutral-border rounded-lg flex items-center justify-center">
                <span className="text-text-tertiary opacity-50 text-lg">Product Image</span>
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-text-primary mb-4">Man Dust</h2>
                <p className="text-text-primary text-lg leading-relaxed">
                  {manDustProduct.description}
                </p>
              </div>

              {/* Key Benefits */}
              <div>
                <h3 className="text-xl font-semibold text-text-primary mb-3">Key Benefits</h3>
                <ul className="space-y-2 text-text-primary">
                  <li>• Natural testosterone support</li>
                  <li>• Enhanced energy and vitality</li>
                  <li>• Improved muscle strength</li>
                  <li>• Better recovery and endurance</li>
                  <li>• Premium ingredient blend</li>
                </ul>
              </div>

              {/* Subscription Plans */}
              <div className="bg-surface border border-neutral-border rounded-lg p-6">
                <h3 className="text-xl font-semibold text-text-primary mb-4">Choose Your Plan</h3>
                
                <div className="space-y-3 mb-6">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="plan"
                      value="monthly"
                      checked={selectedPlan === 'monthly'}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className="text-brand-secondary"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-text-primary">Monthly Subscription</span>
                        <span className="text-text-primary font-bold">
                          ${(manDustProduct.price.monthly.amount / 100).toFixed(2)}/month
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary">Delivered every 30 days</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="plan"
                      value="quarterly"
                      checked={selectedPlan === 'quarterly'}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className="text-brand-secondary"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-text-primary">Quarterly Subscription</span>
                        <div className="text-right">
                          <span className="text-text-primary font-bold">
                            ${(manDustProduct.price.quarterly.amount / 100).toFixed(2)}/3 months
                          </span>
                          <p className="text-sm text-brand-secondary">Save 15%</p>
                        </div>
                      </div>
                      <p className="text-sm text-text-secondary">Delivered every 90 days</p>
                    </div>
                  </label>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="w-full cupgrade-button text-lg py-3"
                >
                  Add to Cart - ${(manDustProduct.price[selectedPlan as keyof typeof manDustProduct.price].amount / 100).toFixed(2)}
                </button>
              </div>

              {/* Guarantee */}
              <div className="bg-brand-secondary/10 border border-brand-secondary/20 rounded-lg p-4">
                <h4 className="font-semibold text-text-primary mb-2">30-Day Money Back Guarantee</h4>
                <p className="text-sm text-text-primary">
                  Not satisfied? Get a full refund within 30 days of your first order.
                </p>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-surface border border-neutral-border rounded-lg">
              <h4 className="font-semibold text-text-primary mb-2">Premium Ingredients</h4>
              <p className="text-sm text-text-primary">
                Carefully selected, high-quality ingredients backed by science.
              </p>
            </div>

            <div className="text-center p-6 bg-surface border border-neutral-border rounded-lg">
              <h4 className="font-semibold text-text-primary mb-2">Third-Party Tested</h4>
              <p className="text-sm text-text-primary">
                Every batch is tested for purity and potency by independent labs.
              </p>
            </div>

            <div className="text-center p-6 bg-surface border border-neutral-border rounded-lg">
              <h4 className="font-semibold text-text-primary mb-2">Made in USA</h4>
              <p className="text-sm text-text-primary">
                Manufactured in FDA-registered facilities following strict quality standards.
              </p>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-text-primary mb-8 text-center">Frequently Asked Questions</h3>
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="bg-surface border border-neutral-border rounded-lg p-6">
                <h4 className="font-semibold text-text-primary mb-2">How long does it take to see results?</h4>
                <p className="text-text-primary">
                  Most men begin to notice improvements in energy and vitality within 2-4 weeks of consistent use.
                </p>
              </div>

              <div className="bg-surface border border-neutral-border rounded-lg p-6">
                <h4 className="font-semibold text-text-primary mb-2">Is Man Dust safe to use?</h4>
                <p className="text-text-primary">
                  Yes, Man Dust is made with natural ingredients and is generally well-tolerated. Consult your healthcare provider before starting any new supplement.
                </p>
              </div>

              <div className="bg-surface border border-neutral-border rounded-lg p-6">
                <h4 className="font-semibold text-text-primary mb-2">Can I cancel my subscription anytime?</h4>
                <p className="text-text-primary">
                  Absolutely. You can pause, modify, or cancel your subscription at any time through your account dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 