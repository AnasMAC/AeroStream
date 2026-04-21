let hls;

viewHomePage();

function viewHomePage() {
  const rootDiv = document.querySelector("#root");
  rootDiv.classList.add("remove-display");

  rootDiv.innerHTML = `
        <div class="background-img-container">
        <nav class="nav-bar">
          <ul>
            <li><a href="/" class="nav-title">StreamLine</a></li>
            <li><a href="/" class="nav-link">Home</a></li>
          </ul>
        </nav>
        <header class="hero-section">
          <h1>Watch your favourite movies and series</h1>
          <p>
            StreamLine provides unlimited access to blockbuster movies, trending
            series, and exclusive content anytime, anywhere.
          </p>
          <button class="btn primary-btn">
            <a href="#catalog">Watch movie</a>
          </button>
        </header>
      </div>
      <main>
        <section class="all-videos">
          <h1>
            <a name="catalog">Catalog</a>
          </h1>
          <div class="list-videos">
          </div>
        </section>
      </main>
      `;

  rootDiv.querySelector("a.nav-link").addEventListener("click", (e) => {
    e.preventDefault();
    viewHomePage();
  });
  fetch("/api/videos")
    .then((res) => res.json())
    .then((data) => {
      const videosContainer = document.querySelector(".list-videos");
      data.forEach((videoMetaData) => {
        videosContainer.appendChild(createVideoContainer(videoMetaData));
      });
    })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      rootDiv.classList.remove("remove-display");
    });
}

function createVideoContainer(videoMetaData) {
  const div = document.createElement("div");
  div.classList.add("video-container");

  div.innerHTML = `
    <div class="thumbnail">
      <img alt="Thumbnail">
      <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 330 330"
          aria-hidden="true"
          fill="currentColor"
        >
          <path
            d="M37.73 328.12A15 15 0 0 0 45 330c2.76 0 5.52-.76 7.95-2.28l240-150A15 15 0 0 0 300 165c0-5.17-2.66-9.98-7.05-12.72l-240-150A15 15 0 0 0 30 15v300c0 5.45 2.96 10.48 7.73 13.12Z"
          />
      </svg>
    </div>
    <div class="meta-data">
      <p class="title"></p>
      <p class="category"></p>
    </div>
  `;

  div.querySelector(".title").textContent = videoMetaData.title;
  div.querySelector(".category").textContent = videoMetaData.category;

  div.addEventListener("click", (e) => {
    viewVideoPage(videoMetaData);
  });

  div.querySelector("img").src = "/resources/public-media/" + videoMetaData.minio_path + "/thumbnail.jpg";

  return div;
}

function viewVideoPage(videoMetaData) {
  const rootDiv = document.querySelector("#root");
  rootDiv.classList.add("remove-display");

  rootDiv.innerHTML = `
        <nav class="nav-bar">
          <ul>
            <li><a href="/" class="nav-title">StreamLine</a></li>
            <li><a href="/" class="nav-link">Home</a></li>
          </ul>
        </nav>
        <main>
          <section class="video-live-container">
            <video id="video" controls playsinline></video>
            <h1 class="title"></h1>
            <p class="category"></p>
          </section>
        </main>
        `;

  rootDiv.querySelector(".title").textContent = videoMetaData.title;
  rootDiv.querySelector(".category").textContent = videoMetaData.category;

  rootDiv.querySelector("a.nav-link").addEventListener("click", (e) => {
    e.preventDefault();
    viewHomePage();
  });

  if (hls) hls.destroy();
  hls = new Hls();
  const video = rootDiv.querySelector("#video");

  hls.loadSource("/resources/public-media/" + videoMetaData.minio_path +"/manifest.m3u8");
  hls.attachMedia(video);

  hls.on(Hls.Events.MEDIA_ATTACHED, function () {
    console.log("video and hls.js are now bound together !");
  });
  hls.on(Hls.Events.MANIFEST_PARSED, function () {
    video.play().catch(() => {});
    rootDiv.classList.remove("remove-display");
  });
  hls.on(Hls.Events.ERROR, function (event, data) {
    console.error("HLS error:", data);
    rootDiv.classList.remove("remove-display");
  });
}
