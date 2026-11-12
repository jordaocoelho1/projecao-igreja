# Bíblias

Uma tradução pode estar em um único arquivo `.json`, com `name` e uma lista `books` contendo todos os livros:

```
data/bible/
  almeida-1900.json
```

Ou pode ser uma pasta, com um arquivo `.json` por livro. Nesse caso, os nomes com prefixo numérico definem a ordem dos livros:

```
data/bible/
  nome-da-traducao/
    01-gn.json
    02-ex.json
    ...
```

Cada livro segue este formato:

```json
{
  "id": "gn",
  "name": "Nome do livro",
  "chapters": [
    ["versículo 1", "versículo 2"],
    ["versículo 1"]
  ]
}
```

Os capítulos são listas de versículos. Só coloque textos cuja licença permita o uso na igreja. Para uma fonte com outra estrutura, ajuste a função `adaptBible` em `src/lib/bible.js`.

Traduções também podem ficar na pasta de dados do usuário, em `bible/`, sem precisar recompilar o app.
