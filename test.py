from google import genai

client = genai.Client(api_key="AIzaSyAlAylJfvQd15zgdymkHagWW-5nVjQtsac")

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="This is the place where the prompt to the gemini will be written"
)

print(response.text)
