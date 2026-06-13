async function loadArticles() {

    const container = document.getElementById("articles");

    try {

        const response = await fetch("data/articles.json");

        const articles = await response.json();

        container.innerHTML = "";

        articles.forEach(article => {

            const card = document.createElement("div");

            card.className = "article-card";

            card.innerHTML = `
                <div class="article-category">
                    ${article.category}
                </div>

                <div class="article-title">
                    ${article.title}
                </div>

                <div class="article-date">
                    ${article.date}
                </div>

                <div class="article-excerpt">
                    ${article.excerpt}
                </div>

                <a
                    class="article-link"
                    href="${article.url}">
                    Đọc tiếp →
                </a>
            `;

            container.appendChild(card);

        });

    }
    catch(error){

        container.innerHTML = `
            <p>Không thể tải danh sách bài viết.</p>
        `;

        console.error(error);

    }

}

loadArticles();
