const verdictDiv = document.createElement('div');
    verdictDiv.className = 'final-verdict';

    if (data.round1) {
        const verdictH3 = document.createElement('h3');
        verdictH3.textContent = 'Nihai Karar';
        verdictDiv.appendChild(verdictH3);
    }

    const verdictContent = document.createElement('div');
    verdictContent.className = 'verdict-content';
    verdictContent.innerHTML = data.verdict;

    verdictDiv.appendChild(verdictContent);
    responseBox.appendChild(verdictDiv);
}