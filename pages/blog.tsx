import Layout from '../components/Layout';
import Head from 'next/head';
import Script from 'next/script';

export default function Blog() {
  return (
    <Layout>
      <Head>
        <title>Blog - Goodcup</title>
        <meta name="description" content="Tips, stories, and everything in the Goodcup world." />
      </Head>
      <div className="site-section-bg -mt-[120px] pt-[120px] pb-32 md:pb-48">
        <div className="max-w-4xl mx-auto px-4">
          <div id="soro-blog" />
          <Script
            src="https://app.trysoro.com/api/embed/c400d172-d876-4184-94b7-128244281c8d"
            strategy="lazyOnload"
          />
        </div>
      </div>
    </Layout>
  );
}
