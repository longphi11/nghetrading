async function loadArticles() {

    const container = document.getElementById("articles");

    if (!container) return;

    try {

        const response = await fetch("data/articles.json");

        const articles = await response.json();

        container.innerHTML = "";

        articles.forEach(article => {

            const card = document.createElement("article");

            card.className = "article-card";

            card.innerHTML = `
                <div class="article-meta">

                    <span class="tag">
                        ${article.category}
                    </span>

                    <h4>
                        ${article.title}
                    </h4>

                    <p>
                        ${article.excerpt}
                    </p>

                    <time>
                        ${article.date}
                    </time>

                    <br><br>

                    <a href="${article.url}" class="link-arrow">
                        Đọc tiếp →
                    </a>

                </div>
            `;

            container.appendChild(card);

        });

    } catch(error) {

        container.innerHTML = `
            <p>Không thể tải danh sách bài viết.</p>
        `;

        console.error(error);

    }

}

loadArticles();
