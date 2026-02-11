<script setup>
</script>

<template>
  <div class="not-found">
    <h1>404</h1>
    <p>找不到這個頁面</p>
    <RouterLink to="/" class="btn">回到首頁</RouterLink>
  </div>
</template>

<style scoped>
.not-found {
  text-align: center;
  padding: 50px 20px;
}
h1 {
  font-size: 80px;
  color: #ddd;
  margin: 0;
}
p {
  color: #666;
  margin-bottom: 30px;
}
.btn {
  display: inline-block;
  background: #06c755;
  color: white;
  padding: 10px 20px;
  text-decoration: none;
  border-radius: 8px;
  font-weight: bold;
}
</style>
