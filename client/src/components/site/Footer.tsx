import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/70 bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            Make smarter financial decisions. Privately. Questionnaires, calculators and
            comparisons — no bank login, no PAN, no secrets.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Product</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/recommend" className="hover:text-foreground">Recommendation Engine</Link></li>
            <li><Link to="/charges" className="hover:text-foreground">Hidden Charges Explorer</Link></li>
            <li><Link to="/compare" className="hover:text-foreground">Compare Everything</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/privacy" className="hover:text-foreground">Privacy Center</Link></li>
            <li><a className="hover:text-foreground" href="#faq">FAQ</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Cash&amp;Choices. All rights reserved.</p>
          <p>Educational content only. Not financial advice.</p>
        </div>
      </div>
    </footer>
  );
}
