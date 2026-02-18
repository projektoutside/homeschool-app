process.on('SIGINT', () => {
  process.exit();
});

export default {
  build: {
    rollupOptions: {
      external: (id) => id === 'three' || id.startsWith('three/addons/')
    }
  }
};
