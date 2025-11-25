import Image from "next/image";
import Head from "next/head";

export default function Kiosk() {
  return (
    <>
      <Head>
        <title>Goodcup Kiosk</title>
        <link rel="manifest" href="/kiosk/manifest.json" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/kiosk/icon-192.png" />
      </Head>
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          Goodcup Promo
        </h1>
        <h2 style={{ marginBottom: "1rem", textAlign: "center", fontWeight: 500 }}>
          take your pick
        </h2>

        <div className="cards">
          <div className="card">
            <a href="https://buy.stripe.com/8x2bJ26sAbQ631fev9bEA01?prefilled_promo_code=market10">
              <Image
                src="/media/kiosk/daily_goodcup.webp"
                alt="Daily Goodcup"
                width={600}
                height={600}
                style={{ width: "100%", height: "auto", maxWidth: 280 }}
              />
            </a>
            <a
              className="name"
              href="https://buy.stripe.com/8x2bJ26sAbQ631fev9bEA01?prefilled_promo_code=market10"
            >
              Daily Goodcup
            </a>
          </div>

          <div className="card">
            <a href="https://buy.stripe.com/00w9AUdV2bQ66dr72HbEA02?prefilled_promo_code=market10">
              <Image
                src="/media/kiosk/fire_goodcup.webp"
                alt="Fire Goodcup"
                width={600}
                height={600}
                style={{ width: "100%", height: "auto", maxWidth: 280 }}
              />
            </a>
            <a
              className="name"
              href="https://buy.stripe.com/00w9AUdV2bQ66dr72HbEA02?prefilled_promo_code=market10"
            >
              Fire Goodcup
            </a>
          </div>

          <div className="card">
            <a href="https://buy.stripe.com/dRm5kE7wEbQ66draeTbEA03?prefilled_promo_code=market10">
              <Image
                src="/media/kiosk/sweet_goodcup.webp"
                alt="Sweet Goodcup"
                width={600}
                height={600}
                style={{ width: "100%", height: "auto", maxWidth: 280 }}
              />
            </a>
            <a
              className="name"
              href="https://buy.stripe.com/dRm5kE7wEbQ66draeTbEA03?prefilled_promo_code=market10"
            >
              Sweet Goodcup
            </a>
          </div>
        </div>
      </main>
      <style jsx>{`
        .cards {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          width: 100%;
        }
        .card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .name {
          margin-top: 0.5rem;
          font-weight: 600;
          text-decoration: none;
          color: inherit;
        }
        .name:hover {
          text-decoration: underline;
        }
        @media (min-width: 768px) {
          .cards {
            flex-direction: row;
            justify-content: center;
            gap: 2rem;
          }
        }
      `}</style>
    </>
  );
}

