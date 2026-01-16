# GitHub Pages Deployment

This workflow automatically builds and deploys the app to GitHub Pages when changes are pushed to the `main` branch.

## Configuration

The base path is automatically configured based on your repository name:
- For project pages (username.github.io/repo-name): Base path is `/repo-name/`
- For user/organization pages (username.github.io): Base path is `/`

If you need to customize the base path, edit the `BASE_PATH` environment variable in `.github/workflows/deploy.yml`.

## Troubleshooting

If you see 404 errors after deployment:

1. **Check your repository name**: The base path must match your repository name
2. **Verify GitHub Pages settings**: Go to Settings > Pages and ensure:
   - Source is set to "GitHub Actions"
   - The deployment is successful
3. **Check the build**: Look at the Actions tab to ensure the build succeeded
4. **Clear cache**: Try clearing your browser cache or use incognito mode

## Manual Configuration

If automatic detection doesn't work, you can manually set the base path:

1. Edit `.github/workflows/deploy.yml`
2. Change the `BASE_PATH` environment variable to match your repository:
   ```yaml
   BASE_PATH: /your-repository-name/
   ```
3. Or for root deployment:
   ```yaml
   BASE_PATH: /
   ```
