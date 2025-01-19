from fastapi import FastAPI, Request, HTTPException
from starlette.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()
@app.get("/")
def read_root():
    return {"Welcome to EasyDinar!"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def check_blacklist(request: Request, call_next):
    from app.routes import token_blacklist
    token = request.headers.get("Authorization")
    print(f"Authorization header received: {token}")

    if token and token.startswith("Bearer "):
        token = token.split(" ")[1]  # Extract the token
        if token in token_blacklist:
            raise HTTPException(status_code=401, detail="Token has been invalidated.")

    response = await call_next(request)
    return response

def include_router():
    from app.routes import router
    app.include_router(router)

include_router()

original_openapi = app.openapi


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = original_openapi()
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    openapi_schema["security"] = [{"BearerAuth": []}]

    for path, path_item in openapi_schema["paths"].items():
        for operation in path_item.values():
            operation["security"] = [{"BearerAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)
