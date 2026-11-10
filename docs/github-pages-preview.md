# GitHub Pages preview

This project is configured to export a static preview of the dashboard and module pages to GitHub Pages. No Vercel account is required.

## One-time repository setting

A repository administrator must open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.

## Publish

Push a commit to `feature/app-foundation`, or manually run the **Deploy TravelDesk preview to GitHub Pages** workflow from the Actions tab.

When the workflow succeeds, the preview URL is:

https://pkkhetpal.github.io/travel-agency-management-system/

## Preview limitations

This is a static UI preview using illustrative sample data. It does not include live database writes, authentication, private document storage, notifications or production financial processing. Those require a server-side deployment and configured services. Do not enter real customer or passport information into this preview.

If the repository is made private again, verify GitHub Pages availability for the account/repository plan and confirm that the published site is no longer publicly accessible.
