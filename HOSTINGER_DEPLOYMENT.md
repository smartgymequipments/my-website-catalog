# Automatic Deployment Guide for Hostinger

Your project is now configured for automatic deployment via Git. Follow these steps to connect your Hostinger account to this repository.

## Step 1: Connect Repository

1.  Log in to your **Hostinger Control Panel (hPanel)**.
2.  Navigate to **Advanced** > **Git**.
3.  **Repository URL**: Enter your GitHub repository URL:
    `https://github.com/smartgymequipments/my-website-catalog.git`
4.  **Branch**: Enter `main`.
5.  **Install Directory**: Leave empty (to deploy to `public_html`) or enter a subfolder name.
    -   *Note: If `public_html` is not empty, you might need to delete existing files first or use a subfolder.*
6.  Click **Create**.

## Step 2: Set Up Automatic Updates (Webhook)

1.  After creating the Git repository in Hostinger, look for the **Auto Deployment** section or **Webhook URL**.
2.  Copy the **Webhook URL** provided by Hostinger.
3.  Go to your **GitHub Repository Settings**:
    -   Settings > Webhooks > Add webhook.
    -   **Payload URL**: Paste the Hostinger Webhook URL.
    -   **Content type**: `application/json`.
    -   **Trigger**: Just the `push` event.
    -   Click **Add webhook**.

## Step 3: Verify

1.  Make a change in your local code.
2.  I (the AI) will push the change to GitHub.
3.  GitHub will notify Hostinger via the Webhook.
4.  Hostinger will automatically pull the changes and update your live site.

## Troubleshooting

-   **Permissions**: Ensure the `images` folder and `data.js` have write permissions (755 or 777) in Hostinger File Manager for the admin panel to work.
-   **Reset**: If deployment fails, you can manually click **"Deploy"** in the Hostinger Git section.
