# Curriculum Helpers

## concatRegex

Combines one or more regular expressions into one.

```javascript
const regex1 = /a\s/;
const regex2 = /b/;
concatRegex(regex1, regex2).source === "a\\sb";
```

## permutateRegex

Permutates regular expressions or source strings, to create regex matching elements in any order.

```javascript
const source1 = `titleInput\\.value\\s*(?:!==|!=)\\s*currentTask\\.title`;
const regex1 = /dateInput\.value\s*(?:!==|!=)\s*currentTask\.date/;
const source2 = `descriptionInput\\.value\\s*(?:!==|!=)\\s*currentTask\\.description`;

permutateRegex([source1, regex1, source2]).source === new RegExp(/(?:titleInput\.value\s*(?:!==|!=)\s*currentTask\.title\s*\|\|\s*dateInput\.value\s*(?:!==|!=)\s*currentTask\.date\s*\|\|\s*descriptionInput\.value\s*(?:!==|!=)\s*currentTask\.description|dateInput\.value\s*(?:!==|!=)\s*currentTask\.date\s*\|\|\s*titleInput\.value\s*(?:!==|!=)\s*currentTask\.title\s*\|\|\s*descriptionInput\.value\s*(?:!==|!=)\s*currentTask\.description|descriptionInput\.value\s*(?:!==|!=)\s*currentTask\.description\s*\|\|\s*titleInput\.value\s*(?:!==|!=)\s*currentTask\.title\s*\|\|\s*dateInput\.value\s*(?:!==|!=)\s*currentTask\.date|titleInput\.value\s*(?:!==|!=)\s*currentTask\.title\s*\|\|\s*descriptionInput\.value\s*(?:!==|!=)\s*currentTask\.description\s*\|\|\s*dateInput\.value\s*(?:!==|!=)\s*currentTask\.date|dateInput\.value\s*(?:!==|!=)\s*currentTask\.date\s*\|\|\s*descriptionInput\.value\s*(?:!==|!=)\s*currentTask\.description\s*\|\|\s*titleInput\.value\s*(?:!==|!=)\s*currentTask\.title|descriptionInput\.value\s*(?:!==|!=)\s*currentTask\.description\s*\|\|\s*dateInput\.value\s*(?:!==|!=)\s*currentTask\.date\s*\|\|\s*titleInput\.value\s*(?:!==|!=)\s*currentTask\.title)/).source;
```
