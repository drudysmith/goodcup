yuii9/nimport Link from "next/link";
import Head from "next/head";

export default function KioskInfo() {
  return (
    <>
      <Head>
        <title>Kiosk Info</title>
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
        <h1 style={{ marginBottom: "2rem", textAlign: "center" }}>
          Kiosk Info Page
        </h1>
        <p style={{ marginBottom: "2rem", textAlign: "center", maxWidth: "600px" }}>
          This is a sample subpage within the kiosk experience. Navigation stays
          within the fullscreen kiosk mode.
        </p>
        <Link
          href="/kiosk"
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#000",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "0.5rem",
            fontWeight: 600,
          }}
        >
          Back to kiosk
        </Link>
      </main>
    </>
  );
}

